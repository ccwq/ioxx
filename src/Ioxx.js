import Axios from "axios";

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
} from "./utils"


let ioxxDefaultConfig = {

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



export class Ioxx {

    static create(config){
        return new this(config);
    }

    constructor(config) {

        const m = this;

        m._axiosConfig = (config && config.axiosConfig) || {};

        m._options = Object.assign({}, ioxxDefaultConfig, config);

        m._ax = Axios.create(
            Object.assign({}, m._axiosConfig, {
                baseURL: m._options.baseURL
            })
        );


        //设置适配器
        if (m._options.adapter) {
            m._ax.defaults.adapter = m._options.adapter;
        }

        //拦截器的Map
        m._interceptors = new InterceptorMgr();

        // 在发送请求之前做些什么
        m._ax.interceptors.request.use(
            async function (config) {
                config = m._options.beforeRequest(config) || config;

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
                        config.data = Object.keys(data).map(key => `${key}=${encodeURIComponent(data[key])}`).join('&');
                    }else if(ctype == CONTENT_JSON){
                        //config.data = JSON.stringify(config.data);
                    }
                }
                return config;
            },
            function (error) {

                // 对请求错误做些什么
                return Promise.reject(error);
            },
            function (error) {}
        );


        //相收到之后的立即
        m._ax.interceptors.response.use(
            async function(resp){
                try {
                    resp = await m._options.afterResponse(resp) || resp;
                }catch (e) {
                    throw e;
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
                                throw e;
                            }
                        }
                    }
                }

                return Promise.resolve(resp);
            },
            function(error){
                return Promise.reject(error);
            }
        )


        //增加get,post等方法
        METHOD_TYPE_LIST.forEach(key=>{
            key = key.toLocaleLowerCase();

            m[key] = function(url, data, options){

                //第二个参数可以直接写配置
                if (options === true) {
                    options = data;
                    data = "";
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
                return m.request(options);
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
     * 请求
     * @param axiosOptions
     * @returns {AxiosPromise}
     */
    request(axiosOptions){
        return this._ax(axiosOptions);
    }



    //请求
    $(){

    }
}

export default Ioxx;

