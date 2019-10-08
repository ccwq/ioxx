import Axios from "axios";

const URL_ENCODED_KEY = "Content-Type";
const URL_ENCODED_VALUE = "application/x-www-form-urlencoded";
const _noop  = _=>{};



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






/**
 * 构造器
 * @param config
 * @param axiosConfig
 * @returns {(function(*=, *=): AxiosPromise)|{}|any|(function(*=): ...*)}
 * @constructor
 */
export const IoxxFactory = function(config){

    let axiosConfig = (config && config.axiosConfig) || {};

    let options = Object.assign({}, ioxxDefaultConfig, config);

    let ax = Axios.create(
        Object.assign({}, axiosConfig, {
            baseURL: options.baseURL
        })
    );

    if (options.adapter) {
        ax.defaults.adapter = options.adapter;
    }

    //拦截器的Map
    let interceptors = new InterceptosMgr();

    // 在发送请求之前做些什么
    ax.interceptors.request.use(async function (config) {
            config = options.beforeRequest(config) || config;

            //拦截器处理
            let skey = getKeyFromAxiosOption(config);
            let interceptor = interceptors.get(skey);

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

        let ctype = config.headers[URL_ENCODED_KEY];
        if (!ctype) {
            let defaultHeader = config.headers[config.method.toLocaleLowerCase()]
            ctype = defaultHeader[URL_ENCODED_KEY]
        }

        //特殊处理
        let data = config.data;

        if (data) {
            if (ctype === URL_ENCODED_VALUE) {
                config.data = Object.keys(data).map(key => `${key}=${encodeURIComponent(data[key])}`).join('&');
            }else if(ctype === URL_ENCODED_JSON_VALUE){
                // config.data = JSON.stringify(config.data);
            }
        }
            return config;
        }, function (error) {
            // 对请求错误做些什么
            return Promise.reject(error);
        }, function (error) {}
    );

    ax.interceptors.response.use(
        async function(resp){
            try {
                resp = await options.afterResponse(resp) || resp;
            }catch (e) {
                throw e;
            }

            let config = resp.config;

            //拦截器处理
            let skey = getKeyFromAxiosOption(config), interceptor = interceptors.get(skey);
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

    let ObjectPoll = new Map();

    const _proxy = new Proxy({}, {
        get (target, key) {

            //创建本身
            if (key === "create") {
                return config=>IoxxFactory(config);
            }

            //添加拦截器
            if (key === "addInterceptors") {

                /**
                 * 添加拦截器
                 * url 要拦截的url
                 * before_interceptor 如果传函数则设置为after,如果穿对象就认为是自定义拦截器{before, after}
                 */
                return interceptors.set.bind(interceptors);
            }


            /**
             * ioxx.get("path/to/foo",  {id}, {headers})
             * ioxx.post("path/to/foo", {id}, {headers})
             */
            if (METHOD_TYPE_LIST.includes(key)) {
                key = key.toLocaleLowerCase();
                return function(url, data, options){
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
                    return _proxy.$(options);
                }
            }


            let url, { method, actionName } = divideActionAndMethod(key, '', 'i');

            // $开头的属性不转义
            if (actionName.startsWith('$')) {
                url = actionName.substr(1);
                url = url.replace(/([^$])(_)/g, "$1/");
                url = url.replace(/\$_/g, "_");
            } else {

                // 使驼峰变为路径
                // 重复2次的大写字母变为单个大写字母，不切割
                url = actionName.replace(/[A-Z]/g, function (gp0, index, str) {
                    let gp_1 = str[index - 1], gp1 = str[index + 1], gp_2 = str[index-2];

                    //大写，和后面一样，不动
                    //$在大写前面，$消失，大写保持
                    if (gp0 == gp1 || (gp_1==="$" && gp_2!=="$")) {
                        return gp0;
                        //大写，和前面一样，删自己
                    }else if(gp0 === gp_1){
                        return "";
                        //加分割
                    }else{
                        return "/" + gp0.toLocaleLowerCase();
                    }
                })


                // 单个$在小写字母或者数字前，$变为路径切
                url = url.replace(/(?!$)\$([\da-z]+)/g, function (gp0, gp1, index, str) {
                    return '/' + gp1
                })

                //$的后面部位$则消除该$字符 //消除单个$ //合并$$为单$
                url = url.replace(/\$([^$]|$)/g,"$1");

                //路径加上前缀
                if (!/^https?:\/\//.test(url)) {
                    url = config.baseURL + url
                }

                //解析//,../../,./等语法
                url = pathNormalize(url);
            }

            const _key = `${url}::${method}`;

            //从缓存获取
            if(ObjectPoll.get(key)){
                return ObjectPoll.get(key);
            }

            let _func = function (method_config, data) {
                let config;
                if (typeof method_config === "string") {
                    method = method_config;
                    if (/^get|delete$/.test(method.toLocaleLowerCase())) {
                        config = {params: data};
                    }else{
                        config = {data};
                    }
                }else{
                    config = method_config;
                }
                if (!config) {
                    config = {};
                }

                config = {url, method, ...config};
                if (options.debug) {
                    console.log("ioxx debug[请求配置]:",config);
                }
                return ax(config);
            }

            addAllMethodType(_func);
            ObjectPoll.set(_key, _func);
            return _func;
        }
    });

    return _proxy;
}


//以下为工具函数---

/**
 * 使字符串的首字母大写
 * @param string
 * @returns {*}
 */
function makeFirstLetterUpperCase(string){
    return string.replace(/^\w/,w=>w.toUpperCase())
}



const METHOD_TYPE_LIST = ["get", "post", "put", "delete", "head", "options"];

const METHOD_END_RG = (_=>{
    let ret =  METHOD_TYPE_LIST;
    ret = ret.map(makeFirstLetterUpperCase);
    ret = ret.map(w=>`[^${w[0]}$_]${w}`);
    ret = ret.join("|");
    ret = `(${ret})$`
    return new RegExp(ret);
})()




function addAllMethodType(callback){
    METHOD_TYPE_LIST.forEach(method=>{
        callback[method] = function (args, option) {

            let params,data;
            if (/^get|delete$/i.test(method)) {
                params = args;
            }else{
                data = args;
            }

            return callback({
                params,
                data,
                method,
                ...option
            });
        }
    })
}


/**
 * 获取config url::method 的简写形式
 * @param config
 */
function getKeyFromAxiosOption(config){

    if(!config.url) return "";

    let url = config.url.replace(config.baseURL, "");
    // return `${url}::${(config.method || "get").toLocaleLowerCase()}`
    return `${url}`
}



/**
 * 分割actions和method
 * @param string
 * @param spliter
 * @param flag
 * @returns {{method: string, actionName: *}}
 */
function divideActionAndMethod (string, spliter, flag) {
    let actionName = string; let method = 'get';
    let matched = string.match(METHOD_END_RG);
    if (matched) {
        actionName = string.substr(0, matched.index);
        method = string.substr(matched.index + 1);
    }

    method = method.toLowerCase();
    return { actionName, method }
}


/**
 * 处理路径里面的../|./等字符
 * @param path
 */
function pathNormalize (str) {
    var last = str.substr(-1, 1)

    str = str || ''
    if (str[0] === '/') str = str.substr(1)

    var tokens = str.split('/')
    last = tokens[0]

    // check tokens for instances of .. and .
    for (var i = 1; i < tokens.length; i++) {
        last = tokens[i]
        if (tokens[i] === '..') {
            // remove the .. and the previous token
            tokens.splice(i - 1, 2)
            // rewind 'cursor' 2 tokens
            i = i - 2
        } else if (tokens[i] === '.') {
            // remove the .. and the previous token
            tokens.splice(i, 1)
            // rewind 'cursor' 1 token
            i--
        }
    }

    str = tokens.join('/')
    if (str === './') {
        str = ''
    } else if (last && last.indexOf('.') < 0 && str[str.length - 1] != '/') {
        str += '/'
    }

    if (last != '/' && str.substr(-1, 1) == '/') {
        str = str.substring(0, str.length - 1)
    }

    return str
}


/**
 * 拦截器管理对象
 */
class InterceptosMgr{
    constructor(){
        const m = this;
        m._map = new Map();
    }


    /**
     * 获取key的拦截器列表
     * @param key 正字或者字符串
     * @returns {*|undefined|*}
     */
    getITList(key){
        const m = this;

        //正则
        if (key.test && key.source) {
            for(let [_key, item] of m._map){
                if(key.source === _key.source){
                    return item;
                }
            }

            //字符串
        }else{
            return m._map.get(key) ;
        }
    }

    /**
     * 获取所有匹配的拦截自
     * @param key 字符串 路径
     * @returns {Array}
     */
    get(key){
        const m = this;
        let ret = [];
        m._map.forEach((item, _key, map)=>{

            //正则使用正则匹配
            if(_key.test){
                if (_key.test(key)) {
                    ret = [...ret, ...item];
                }

                //字符串
            }else{
                if (_key === key) {
                    ret = [...ret, ...item];
                }
            }
        });
        return ret;
    }

    /**
     *
     * @param key 可以是正则也可以是字符串
     * @param item
     */
    set(key, before_interceptor){
        const m = this;

        let interceptor;
        if (typeof before_interceptor === "function") {
            interceptor = {before: before_interceptor}
        }else{
            interceptor = before_interceptor;
        }

        let list = m.getITList(key) || [];
        list.push(interceptor);
        m._map.set(key, list);

        //删除拦截器
        return function(){
            let index = list.indexOf(interceptor);
            list.splice(index, 1);
        }
    }

}

let output = IoxxFactory();

export default output;