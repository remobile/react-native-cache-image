/*
* (The MIT License)
* Copyright (c) 2015-2016 YunJiang.Fang <42550564@qq.com>
*/
'use strict';

var Sqlite = require('@remobile/react-native-sqlite');
var fs = require('react-native-fs');

const DB_NAME = "cache_image";
const TABLE_CACHE_ID = "cache_id";
const TABLE_CACHE_IMAGE = "cache_image";
const TABLE_CACHE_STORAGE = "cache_storage";
const CACHE_IMAGE_DIR = 'cacheimages';
const CACHE_IMAGE_SIZE = 1024*1024*50;

var db = Sqlite.openDatabase(DB_NAME, '1.0', 'cache image', 1024*1024*2);

class StorageMgr {
    constructor() {
        this.storage = 0;
        var self = this;
        fs.mkdir(fs.DocumentDirectoryPath+'/'+CACHE_IMAGE_DIR);
        //console.log(fs.DocumentDirectoryPath+'/'+CACHE_IMAGE_DIR);
        db.transaction((tx)=>{
            tx.executeSql('CREATE TABLE IF NOT EXISTS '+TABLE_CACHE_IMAGE+' (url varchar(40) primary key, ref integer, size integer, time integer)');
            tx.executeSql('CREATE TABLE IF NOT EXISTS '+TABLE_CACHE_ID+' (id integer primary key, url varchar(40))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS '+TABLE_CACHE_STORAGE+' (key integer primary key, storage integer)');
            tx.executeSql('SELECT storage FROM '+TABLE_CACHE_STORAGE+' WHERE key=1', [], function (tx, rs) {
                if (rs.rows.length) {
                    self.storage = rs.rows.item(0).storage;
                    //console.log('StorageMgr', self.storage);
                }
            });
        }, (error)=>{
            //console.log('StorageMgr <error>', error);
        });
    }
    updateStorage(offset) {
        var self = this;
        //console.log('StorageMgr updateStorage', this.storage, offset);
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
                //console.log('updateStorage <error>', error);
                resolve(false);
            });
        });
    }
    getCacheFilePath(filename) {
        return fs.DocumentDirectoryPath+'/'+CACHE_IMAGE_DIR+'/'+filename;
    }
    clear() {
        fs.unlink(fs.DocumentDirectoryPath+'/'+CACHE_IMAGE_DIR);
        db.transaction(function (tx) {
    		tx.executeSql('DROP TABLE '+TABLE_CACHE_ID);
    		tx.executeSql('DROP TABLE '+TABLE_CACHE_IMAGE);
    		tx.executeSql('DROP TABLE '+TABLE_CACHE_STORAGE);
            this.storage = 0;
            var self = this;
            fs.mkdir(fs.DocumentDirectoryPath+'/'+CACHE_IMAGE_DIR);
            //console.log(fs.DocumentDirectoryPath+'/'+CACHE_IMAGE_DIR);
            db.transaction((tx)=>{
                tx.executeSql('CREATE TABLE IF NOT EXISTS '+TABLE_CACHE_IMAGE+' (url varchar(40) primary key, ref integer, size integer, time integer)');
                tx.executeSql('CREATE TABLE IF NOT EXISTS '+TABLE_CACHE_ID+' (id integer primary key, url varchar(40))');
                tx.executeSql('CREATE TABLE IF NOT EXISTS '+TABLE_CACHE_STORAGE+' (key integer primary key, storage integer)');
                tx.executeSql('SELECT storage FROM '+TABLE_CACHE_STORAGE+' WHERE key=1', [], function (tx, rs) {
                    if (rs.rows.length) {
                        self.storage = rs.rows.item(0).storage;
                        //console.log('StorageMgr', self.storage);
                    }
                });
            }, (error)=>{
                //console.log('StorageMgr <error>', error);
            });
    	});
    }
}


StorageMgr.TABLE_CACHE_ID = TABLE_CACHE_ID;
StorageMgr.TABLE_CACHE_IMAGE = TABLE_CACHE_IMAGE;
StorageMgr.CACHE_IMAGE_SIZE = CACHE_IMAGE_SIZE;
StorageMgr.db = db;

module.exports = StorageMgr;
