'use strict';
const React = require('react');
const ReactNative = require('react-native');
const {
    Image,
} = ReactNative;
const StorageMgr = require('./storageMgr.js');
const storageMgr = new StorageMgr();

const CacheImage = React.createClass({
    getInitialState() {
        return {
            source: null,
            showImage: true,
        }
    },
    componentWillMount() {
        const {url} = this.props;
        if (url) {
            storageMgr.checkImageSource(url).then((source)=>{
                this.setState({source, showImage: false}, ()=>{
                    this.setState({ showImage: true });
                });
            });
        }
    },
    componentWillReceiveProps(nextProps) {
        const {url} = nextProps;
        if (url && url !== this.props.url) {
            storageMgr.checkImageSource(url).then((source)=>{
                this.setState({source, showImage: false}, ()=>{
                    this.setState({ showImage: true });
                });
            });
        }
    },
    render() {
        const {showImage, source} = this.state;
        const {defaultSource, children, ...other} = this.props;
        return (
            showImage &&
            <Image
                {...other}
                source={source||defaultSource }
                >
                {this.props.children}
            </Image>
            ||
            null
        )
    },
});

CacheImage.storage = storageMgr; /*export clear(), setCacheSize(单位 M)*/
module.exports = CacheImage;
