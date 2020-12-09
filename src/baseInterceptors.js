import get from "lodash/get";
import set from "lodash/set";



export default [

    /**
     * 处理/和./开头的请求
     */
    {
        key:"*",
        name:"pathFixer",
        data:{
            before(config){
                const {url, baseURL} = config;

                if (typeof location != "undefined") {

                    const {origin: pageOrigin, pathname: pagePathName} = location;

                    if (!url.startsWith("http")) {
                        config.url = baseURL + url;

                        //相对于当前html
                        if (url.startsWith("./")) {
                            const dirPath = pagePathName.split("/").slice(0, -1).join("/");
                            let dir = pageOrigin + "/" + (dirPath || "");
                            config.url = dir + "/" + url.substr(2);

                            //相对于跟
                        }else if (url.startsWith("/")) {
                            config.url = pageOrigin + url;
                        }
                    }
                }
            }
        }
    },


    /**
     * 设置content-type的快捷属性
     * ctype="json"
     * ctype="form"
     */

    {
        key:"*",
        name:"content-type-show-cut",
        data:{
            before(config){
                const {ctype} = config;
                if (ctype) {
                    if (ctype == "json") {
                        set(config, contentTypeField, "application/json");
                    }else if (ctype == "form") {
                        set(config, contentTypeField, "application/x-www-form-urlencoded");
                    }
                }
            }
        }
    }
]


const contentTypeField = "headers.Content-Type";

