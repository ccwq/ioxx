/**
 * 拦截器管理对象
 */
class InterceptorMgr{
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
                if (_key == key || _key == "*") {
                    ret = [...ret, ...item];
                }
            }
        });
        return ret;
    }

    /**
     *
     * @param key 可以是正则也可以是字符串
     * @param before_interceptor {before:Function, after:Function} or before:Function
     */
    set(key, before_interceptor){
        const m = this;

        let interceptor;
        if (typeof before_interceptor === "function") {
            interceptor = {before: before_interceptor}
        }else{
            interceptor = before_interceptor;
        }

        const {prepend} = interceptor;

        let list = m.getITList(key) || [];

        if (prepend) {
            list.unshift(interceptor);
        }else{
            list.push(interceptor);
        }
        m._map.set(key, list);

        //删除拦截器
        return function(){
            let index = list.indexOf(interceptor);
            list.splice(index, 1);
        }
    }
}

export default InterceptorMgr;