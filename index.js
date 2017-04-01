'use strict';
const React = require('react');
const ReactNative = require('react-native');
const {
    Image,
} = ReactNative;

const TimerMixin = require('react-timer-mixin');
const StorageMgr = require('./storageMgr.js');

const storageMgr = new StorageMgr();

const CacheImage = React.createClass({
    mixins: [TimerMixin],
    getDefaultProps() {
        return {
            timeOut: 60,
        };
    },
    getInitialState() {
        return {
            loaded: false,
        }
    },
    componentWillMount() {
        const {url} = this.props;
        const time = Date.now();
        storageMgr.checkImageSource(url).then((source)=>{
            if (source) {
                const diff = this.props.timeOut - (Date.now() - time);
                if (diff > 0) {
                    this.setTimeout(()=>{
                        this.setState({loaded:true, source});
                    }, diff);
                } else {
                    this.setState({loaded:true, source});
                }
            }
        });
    },
    componentWillUnmount() {
        this.reloading = false;
    },
    componentWillReceiveProps(nextProps) {
        const {url} = nextProps;
        if (url !== this.props.url) {
            this.reloading = true;
            const time = Date.now();
            storageMgr.checkImageSource(url).then((source)=>{
                if (this.reloading) {
                    this.reloading = false;
                    if (source) {
                        const diff = this.props.timeOut - (Date.now() - time);
                        if (diff > 0) {
                            this.setTimeout(()=>{
                                this.setState({loaded:true, source});
                            }, diff);
                        } else {
                            this.setState({loaded:true, source});
                        }
                    }
                }
            });
        }
    },
    render() {
        const {loaded, source} = this.state;
        const {defaultSource, children, ...other} = this.props;
        return (
            <Image
                {...other}
                source={loaded ? source : defaultSource }
                >
                {this.props.children}
            </Image>
        )
    },
});

CacheImage.clear = storageMgr.clear;
module.exports = CacheImage;
