import Axios from "axios";
import isPlainObject from "lodash/isPlainObject.js";
const CONTENT_TYPE_HEADERS_KEY = "Content-Type";
const CONTENT_URL_ENCODED = "application/x-www-form-urlencoded";
const CONTENT_JSON="application/json";
const _noop  = _=>{};

import InterceptorMgr from "./InterceptorMgr";

import {
    makeFirstLetterUpperCase,
    METHOD_TYPE_LIST,
    METHOD_END_RG,
    addAllMethodType,
    getKeyFromAxiosOption,
    divideActionAndMethod,
    pathNormalize,
} from "./utils";

import baseInterceptors from "./baseInterceptors";


let ioxxDefaultConfig = {

    //使用默认拦截器
    userBaseInterceptors: false,


    baseURL:"",

    /**
     *.function(response){return Promise}
     */
    beforeRequest: _noop,

    afterResponse: _noop,

    /**
     * 开启会输出请求信息到控制台
     */
    debug: true,

    /**
     * 设置axios的适配器 {see: https://github.com/bigmeow/axios-miniprogram-adapter}
     */
    adapter:"",

    //axios的配置
    axiosConfig:""
};


const noop = _=>_;




export class Ioxx {

    static create(config){
        return new this(config);
    }

    constructor(config) {

        const m = this;

        //拦截器的Map
        m._interceptors = new InterceptorMgr();

        m._axiosConfig = (config && config.axiosConfig) || {};

        m._options = Object.assign({}, ioxxDefaultConfig, config);

        const options = m._options;

        let {
            userBaseInterceptors,
            beforeRequest = noop,
            afterResponse = noop,
            adapter,
            baseURL="/",
        } = options;


        //baseURL自动附加"/"后缀
        baseURL = baseURL.replace(/\/*$/, "/");
        options.baseURL = baseURL;

        //增加默认处理
        m.addInterceptors("*", {
            before:beforeRequest,
            after:afterResponse,
            prepend:false,
        })

        if (userBaseInterceptors) {
            baseInterceptors.forEach(({key, data})=>{
                m.addInterceptors(key, data);
            })
        }

        m._ax = Axios.create(
            Object.assign({}, m._axiosConfig, {baseURL})
        );

        //设置适配器
        if (adapter) {
            m._ax.defaults.adapter = adapter;
        }

        // 在发送请求之前做些什么
        m._ax.interceptors.request.use(
            async function (config) {

                //拦截器处理
                let skey = getKeyFromAxiosOption(config);
                let interceptor = m._interceptors.get(skey);

                if (interceptor) {
                    for(let i=0; i< interceptor.length; i++){
                        let ict = interceptor[i];
                        if (ict.before) {
                            try {
                                config = await ict.before(config) || config;
                            }catch (e) {
                                throw e;
                            }
                        }
                    }
                }

                let ctype = config.headers[CONTENT_TYPE_HEADERS_KEY];
                if (!ctype) {
                    let defaultHeader = config.headers[config.method.toLocaleLowerCase()]
                    ctype = defaultHeader[CONTENT_TYPE_HEADERS_KEY]
                }

                //特殊处理
                let data = config.data;

                if (data) {
                    if (ctype == CONTENT_URL_ENCODED) {
                        if(isPlainObject(config.data)){
                            config.data = Object.keys(data).map(key => `${key}=${encodeURIComponent(data[key])}`).join('&');
                        }
                    }else if(ctype == CONTENT_JSON){
                        if (isPlainObject(config.data)) {
                            try {
                                config.data = JSON.stringify(config.data);
                            }catch (e) {
                                console.warn("转换Object到Strings失败", config);
                            }
                        }
                    }
                }
                return config;
            },
            function (error) {

                // 对请求错误做些什么
                return Promise.reject(error);
            }
        );


        const afterResp = async function(error, resp){

            if (error) {
                // throw error;
                return Promise.reject(error);
            }

            let config = resp.config;

            //拦截器处理
            let skey = getKeyFromAxiosOption(config);
            let interceptor = m._interceptors.get(skey);
            if (interceptor) {
                for(let i=0; i< interceptor.length; i++){
                    let ict = interceptor[i];
                    if(ict.after){
                        try {
                            resp = await ict.after(resp) || resp;
                        }catch (e) {
                            return Promise.reject(e);
                        }
                    }
                }
            }

            return resp;
        }

        //响应收到之后的处理
        m._ax.interceptors.response.use(resp=>afterResp(null, resp), error => afterResp(error));


        //增加get,post等方法
        METHOD_TYPE_LIST.forEach(key=>{
            key = key.toLocaleLowerCase();
            /**
             * 分method请求
             * @param url 请求地址
             * @param data_options 请求options或者data。根据键自动识别
             * @param isOptions 用来决定是否为options,如果未设置则通过前一个参数猜测
             * @returns {AxiosPromise}
             */
            m[key] = function (url, data_options, isOptions) {
                let data, options;
                if (isPlainObject(data_options)) {
                    const _opt = data_options;

                    //检测是否为options
                    if (isOptions === void 0) {
                        isOptions = "isOptions,data,params,headers,url,methods,responseType".split(",").reduce((result, key, ls) => {
                            if (_opt[key]) {
                                result = true;
                                ls.splice(1);
                            }
                            return result;
                        }, false);
                    }

                    if (isOptions) {
                        options = _opt;
                    } else {
                        data = data_options;
                    }
                }

                /**
                 * 没有配置
                 */
                if (!options) {
                    options = {};
                }

                options.method = key;
                options.url = url;

                let dataKey = /^(get|delete)$/.test(key) ? "params" : "data";
                if (data) {
                    options[dataKey] = data;
                }
                return m._ax(options);
            }
        })
    }

    /**
     * 添加拦截器
     * url 要拦截的url
     * before_interceptor 如果传函数则设置为after,如果穿对象就认为是自定义拦截器{before, after}
     */
    addInterceptors(key, before_interceptor){
        return this._interceptors.set(key, before_interceptor);
    }


    /**
     * 支持参数顺序打乱的请求
     * 例如
     *       request(axiosOption)
     *       request("user/info", "get", {id:5})
     *       request("user/info", "get", {id:5})
     *       request("user/info", "post", {id:9}, {headers:{token:100}})
     *       request({id:9}, {headers:{token:100}, "user/info", "get")
     * @param rest
     */
    request(...rest){
        const m = this;

        if(rest.length == 1 && isPlainObject(rest[0])){
            return m._ax(rest[0]);
        }

        let method="get", url="", options, params, data;

        let _rest = [...rest];

        //获取method
        let _method_index = _rest.findIndex(p => {
            if (typeof p == "string") {
                return METHOD_TYPE_LIST.includes(p.toLowerCase())
            } else {
                return false;
            }
        });
        if(_method_index>0){
            method = _rest[_method_index].toLowerCase();
            _rest.splice(_method_index, 1);
        }


        //获取url
        let _url_index = _rest.findIndex(p=>typeof p == "string");
        if (_url_index>0) {
            url = _rest[_url_index];
            _rest.splice(_url_index, 1);
        }

        _rest.forEach(p=>{
            if(isPlainObject(p)){
                if(p.headers || p.data || p.params || p.url || p.method){
                    options = p;
                }else{
                    if(method == "get" || method=="delete"){
                        params = p;
                    }else{
                        data = p;
                    }
                }
            }
        })

        let ret = {...options};

        if(method){
            ret.method = method;
        }

        if(url){
            ret.url = url;
        }

        if(data){
            ret.data = data;
        }

        if(params){
            ret.params = params;
        }

        return m._ax(ret);
    }
}




export default Ioxx;

