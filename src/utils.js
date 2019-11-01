
/**
 * 使字符串的首字母大写
 * @param string
 * @returns {*}
 */
export function makeFirstLetterUpperCase(string){
    return string.replace(/^\w/,w=>w.toUpperCase())
}



export const METHOD_TYPE_LIST = ["get", "post", "put", "delete", "head", "options"];

export const METHOD_END_RG = (_=>{
    let ret =  METHOD_TYPE_LIST;
    ret = ret.map(makeFirstLetterUpperCase);
    ret = ret.map(w=>`[^${w[0]}$_]${w}`);
    ret = ret.join("|");
    ret = `(${ret})$`
    return new RegExp(ret);
})()




export function addAllMethodType(callback){
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
export function getKeyFromAxiosOption(config){

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
export function divideActionAndMethod (string, spliter, flag) {
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
export function pathNormalize (str) {
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


