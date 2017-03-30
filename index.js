'use strict';
const React = require('react');
const ReactNative = require('react-native');

const {
    View,
    Image,
    Text,
    StyleSheet,
    ActivityIndicator,
} = ReactNative;

const StorageMgr = require('./storageMgr.js');
const fs = require('react-native-fs');

/* list status change graph
*
*STATUS_NONE->[STATUS_LOADING]
*STATUS_LOADING->[STATUS_LOADED, STATUS_UNLOADED]
*
*/
const
    STATUS_NONE = 0,
    STATUS_LOADING = 1,
    STATUS_LOADED = 2,
    STATUS_UNLOADED = 3;

const storageMgr = new StorageMgr();

const CacheImage = React.createClass({
    getInitialState () {
        return {
            status:STATUS_NONE,
        };
    },
    componentWillMount () {
        const { url } = this.props;
        this.setState({ status:STATUS_LOADING }, () => {
            storageMgr.checkImageSource(url).then((source) => {
                if (this.state && this.state.status === STATUS_LOADING) {
                    if (source) {
                        this.setState({ status:STATUS_LOADED, source });
                    } else {
                        this.setState({ status:STATUS_UNLOADED });
                    }
                }
            });
        });
    },
    componentWillUnmount () {
        this.state.status = STATUS_NONE;
        this.reloading = false;
    },
    componentWillReceiveProps (nextProps) {
        const { url } = nextProps;
        if (url !== this.props.url) {
            this.reloading = true;
            storageMgr.checkImageSource(url).then((source) => {
                if (this.reloading) {
                    this.reloading = false;
                    if (source) {
                        this.setState({ status:STATUS_LOADED, source });
                    }
                }
            });
        }
    },
    renderLoading () {
        return (
            <Image
                {...this.props}
                style={[this.props.style, { justifyContent:'center', alignItems:'center' }]}
                source={this.props.defaultSource}
                >
                <ActivityIndicator style={styles.spinner} size='small' />
            </Image>
        );
    },
    renderLocalFile () {
        return (
            <Image
                {...this.props}
                source={this.state.source}
                >
                {this.props.children}
            </Image>
        );
    },
    render () {
        const { status } = this.state;
        if (status === STATUS_LOADING) {
            return this.renderLoading();
        } else if (status === STATUS_LOADED) {
            return this.renderLocalFile();
        } else {
            return (
                <Image
                    {...this.props}
                    source={this.props.defaultSource}
                    >
                    {this.props.children}
                </Image>
            );
        }
    },
});

CacheImage.clear = storageMgr.clear;
module.exports = CacheImage;

const styles = StyleSheet.create({
    spinner: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 25,
        height: 25,
        backgroundColor: 'transparent',
    },
});
