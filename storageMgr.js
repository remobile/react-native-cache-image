/*
* (The MIT License)
* Copyright (c) 2015-2016 YunJiang.Fang <42550564@qq.com>
*/
'use strict';

var Sqlite = require('@remobile/react-native-sqlite');
var fs = require('react-native-fs');
var FileTransfer = require('@remobile/react-native-file-transfer');
var md5 = require("./md5.js");

const DB_NAME = "cache_image";
const TABLE_CACHE_IMAGE = "cache_image";
const TABLE_CACHE_STORAGE = "cache_storage";
const CACHE_IMAGE_DIR = 'cacheImages';
const CACHE_IMAGE_SIZE = 1024*1024*50;

var syncImageSource = {};
var db = Sqlite.openDatabase({name:DB_NAME, location: 'default'});

class StorageMgr {
    constructor() {
        var self = this;
        self.storage = 0;
        fs.mkdir(fs.DocumentDirectoryPath+'/'+CACHE_IMAGE_DIR);
        //console.log(fs.DocumentDirectoryPath+'/'+CACHE_IMAGE_DIR);
        db.transaction((tx)=>{
            tx.executeSql('CREATE TABLE IF NOT EXISTS '+TABLE_CACHE_IMAGE+' (filename varchar(40) primary key, size integer, time integer)');
            tx.executeSql('CREATE TABLE IF NOT EXISTS '+TABLE_CACHE_STORAGE+' (key integer primary key, storage integer)');
            tx.executeSql('SELECT storage FROM '+TABLE_CACHE_STORAGE+' WHERE key=1', [], (tx, rs)=>{
                if (rs.rows.length) {
                    self.storage = rs.rows.item(0).storage;
                    //console.log('StorageMgr', self.storage);
                }
            });
        }, (error)=>{
            console.log('StorageMgr <error>', error);
        });
    }
    getCacheFilePath(filename) {
        return fs.DocumentDirectoryPath+'/'+CACHE_IMAGE_DIR+'/'+filename+'.png';
    }
    lock(filename) {
        syncImageSource[filename] = true;
    }
    unlock(filename) {
        delete syncImageSource[filename];
    }
    islock(filename) {
        return syncImageSource[filename];
    }
    clear() {
        var self = this;
        fs.unlink(fs.DocumentDirectoryPath+'/'+CACHE_IMAGE_DIR);
        db.transaction((tx)=>{
            tx.executeSql('DROP TABLE '+TABLE_CACHE_IMAGE);
            tx.executeSql('DROP TABLE '+TABLE_CACHE_STORAGE);
            self.storage = 0;
            fs.mkdir(fs.DocumentDirectoryPath+'/'+CACHE_IMAGE_DIR);
            //console.log(fs.DocumentDirectoryPath+'/'+CACHE_IMAGE_DIR);
            db.transaction((tx)=>{
                tx.executeSql('CREATE TABLE IF NOT EXISTS '+TABLE_CACHE_IMAGE+' (filename varchar(40) primary key, size integer, time integer)');
                tx.executeSql('CREATE TABLE IF NOT EXISTS '+TABLE_CACHE_STORAGE+' (key integer primary key, storage integer)');
                tx.executeSql('SELECT storage FROM '+TABLE_CACHE_STORAGE+' WHERE key=1', [], (tx, rs)=>{
                    if (rs.rows.length) {
                        self.storage = rs.rows.item(0).storage;
                        //console.log('StorageMgr', self.storage);
                    }
                });
            }, (error)=>{
                console.log('StorageMgr <error>', error);
            });
        });
    }
    addCacheImage(filename, size) {
		return new Promise((resolve, reject) => {
            db.transaction((tx)=>{
                tx.executeSql('INSERT INTO '+TABLE_CACHE_IMAGE+' (filename, size, time) VALUES (?, ?, ?)', [filename, size, parseInt(Date.now()/1000)], (tx, rs)=>{
                    //console.log('addCacheImage <insert>', filename, size);
                    resolve(true);
                });
            }, (error)=>{
                console.log('addCacheImage <error>', filename, size, error);
                resolve(false);
            });
		});
	}
    updateCacheImage(filename) {
		return new Promise((resolve, reject) => {
            db.transaction((tx)=>{
                tx.executeSql('UPDATE '+TABLE_CACHE_IMAGE+' SET time=?'+' WHERE filename=?', [parseInt(Date.now()/1000), filename], (tx, rs)=>{
                    //console.log('updateCacheImage <insert>', filename);
                    resolve(true);
                });
            }, (error)=>{
                console.log('updateCacheImage <error>', filename, error);
                resolve(false);
            });
		});
	}
    deleteCacheImage() {
        var self = this;
        return new Promise((resolve, reject) => {
            db.transaction((tx)=>{
                tx.executeSql('SELECT filename, size FROM '+TABLE_CACHE_IMAGE+' WHERE time=(SELECT MIN(time) FROM '+TABLE_CACHE_IMAGE+')', [], (tx, rs)=>{
                    if (rs.rows.length) {
                        var {filename, size} = rs.rows.item(0);
                        tx.executeSql('DELETE FROM '+TABLE_CACHE_IMAGE+' WHERE filename=?', [filename], async (tx, rs)=>{
                            //console.log('deleteCacheImage <delete>', filename, size);
                            await fs.unlink(self.getCacheFilePath(filename));
                            await self.updateStorage(-size);
                            resolve();
                        });
                    }
                });
            }, (error)=>{
                console.log('deleteCacheImage <error>', error);
                reject(error);
            });
        });
    }
    updateStorage(offset) {
        var self = this;
        //console.log('StorageMgr updateStorage', self.storage, offset);
        return new Promise(async(resolve, reject) => {
            db.transaction((tx)=>{
                tx.executeSql('UPDATE '+TABLE_CACHE_STORAGE+' SET storage=storage+?'+' WHERE key=1', [offset], (tx, rs)=>{
                    if (rs.rowsAffected == 0) {
                        tx.executeSql('INSERT INTO '+TABLE_CACHE_STORAGE+' (key, storage) VALUES (1, ?)', [offset], (tx, rs)=>{
                            //console.log('updateStorage <insert>', offset);
                            self.storage = offset;
                            resolve(true);
                        });
                    } else {
                        //console.log('updateStorage <update>', offset);
                        self.storage += offset;
                        resolve(true);
                    }
                });
            }, (error)=>{
                console.log('updateStorage <error>', error);
                resolve(false);
            });
        });
    }
    checkCacheStorage() {
        var self = this;
        return new Promise(async(resolve, reject) => {
            //console.log('target:', self.storage);
            while (self.storage >= CACHE_IMAGE_SIZE) {
                await self.deleteCacheImage();
                //console.log('after:', self.storage);
            }
            resolve();
        });
    }
    downloadImage(url, filepath, filename) {
        var self = this;
        return new Promise(async(resolve, reject) => {
            var fileTransfer = new FileTransfer();
            fileTransfer.download(
                url,
                filepath,
                async(result)=>{
                    console.log("downloadImage success:", result);
                    var info = await fs.stat(filepath);
                    await self.addCacheImage(filename, info.size);
                    await self.updateStorage(info.size);
                    await self.checkCacheStorage();
                    resolve(true);
                },
                (error)=>{
                    console.log("downloadImage error:", error);
                    resolve(false);
                },
                true
            );
        });
    }
    syncCheckImageSource(obj) {
        var self = this;
        if (self.islock(obj.filename)) {
            setTimeout(()=>{self.syncCheckImageSource(obj)}, 100);
        } else {
            self.doCheckImageSource(obj);
        }
    }
    async doCheckImageSource(obj) {
        var {url, filename, filepath, resolve} = obj;
        this.lock(filename);
        var isExist = await fs.exists(filepath);
        //console.log(this.param);
        console.log('Is File exist', isExist);
        if (isExist) {
            await this.updateCacheImage(filename);
            resolve({uri:'file://'+filepath});
        } else {
            var success = await this.downloadImage(url, filepath, filename);
            resolve(success ? {uri:'file://'+filepath} : null);
        }
        this.unlock(filename);
    }
    checkImageSource(url) {
        var self = this;
        return new Promise(async(resolve, reject) => {
            var filename =  md5(url);
            var filepath = self.getCacheFilePath(filename);
            self.syncCheckImageSource({url, filename, filepath, resolve});
        });
    }
}

module.exports = StorageMgr;
