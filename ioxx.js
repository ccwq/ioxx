import axios from 'axios'
import { baseURL } from '../config'

const ax = axios.create({
    transformRequest: [
        (data, headers) => {
            if (!data) return ''
            if (headers['Content-Type'] == 'application/x-www-form-urlencoded') {
                return Object.keys(data).map(key => `${key}=${encodeURIComponent(data[key])}`).join('&')
            }
            return data
        }
    ],

    transformResponse: [
        data => {
            return data
        }
    ]
})

/**
 * 请求样式转换
 * @param actions_type
 * @param config
 */
export const generateAxiosRequestConfig = function (actions_type, config) {
    let [url, method = 'get'] = actions_type.split('::')
    config = config || {}
    if (!/^https?:\/\//.test(url)) {
        url = baseURL + url
    }
    url = pathNormalize(url)
    return { ...config, url, method }
}

export default function request (actions, config) {
    return ax(generateAxiosRequestConfig(actions, config))
}

function genAJAXMethodFindRegexp (spliter, flag) {
    if (spliter) {
        spliter = '\\' + spliter
    }
    return new RegExp(spliter + '(get|post|delete|put)$', flag)
}

function divideActionAndMethod (string, spliter, flag) {
    let rg_method = genAJAXMethodFindRegexp(spliter, flag)
    let actionName = string; let method = 'get'
    if (rg_method.test(string)) {
        method = RegExp.$1
        actionName = string.replace(rg_method, '')
    }
    method = method.toLocaleLowerCase()

    return { actionName, method }
}

/**
 * 使用下划线来作为action的分割
 * api.user_get_info_post(config) 会被翻译成
 * axios({
 *      ...config
 *      url:"user/get/info",
 *      method:"post"
 * })
 * @type {{}}
 */
export const api2 = new Proxy({}, {
    get (target, key) {
        let { method, actionName } = divideActionAndMethod(key, '_', 'i')
        let url = actionName.replace(/_/g, '/')
        return function (config) {
            return request(`${url}::${method}`, config)
        }
    }
})

/**
 * 使用驼峰来作为action的分割
 * api.userInfoGet(config) 会被翻译成
 * axios({
 *      ...config
 *      url:"user/info",
 *      method:"get"
 * })
 * api.noteAttachLLengthGetPost -> note/attachLength/get::post //注意LLength L 写了两遍
 * api.noteAttach$LLengthGetPost -> note/attachLLength/get::post //注意LLength 前面的 $
 * api.userGetId$10 -> user/get/id/10
 * api.userProfile("get", {id:1})-> user/profile/id/10, get, params:{id:1}
 * api.userProfile("post", {avator:'a.jpg'})-> user/profile, post, data:{id:1}
 * 使用$开头action不转义
 * api["$user/get/id/10"] -> user/get/id/10
 * @type {{}}
 **/
export const api = new Proxy({}, {
    get (target, key) {
        let { method, actionName } = divideActionAndMethod(key, '', 'i'); let url

        // $开头的属性不转义
        if (actionName.startsWith('$')) {
            url = actionName.substr(1)
        } else {
            // 使驼峰变为路径
            url = actionName.replace(/([\s\S])([A-Z])(.)/g, function (gp0, gp0_5, gp1, gp2, index, str) {
                // 重复的大写字母
                if (gp1 == gp2) {
                    if (gp0_5 == '$') {
                        return gp1 + gp2
                    } else {
                        return gp0_5 + gp1
                    }
                // 不重复的大写字母，转换路径
                } else {
                    return gp0_5 + '/' + gp1.toLocaleLowerCase() + gp2
                }
            })

            // $在数字前，强制切割路径
            url = url.replace(/$([\d]+)/, function (gp0, gp1, index, str) {
                return '/' + gp1
            })
        }

        return function (method_config, data) {
            let config;
            if (typeof method_config === "string") {
                method = method_config;
                if (method.toLocaleLowerCase() === "get") {
                    config = {params: data};
                }else{
                    config = {data};
                }
            }else{
                config = method_config;
            }
            return request(`${url}::${method}`, config)
        }
    }
})

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
