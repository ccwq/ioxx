//收集常用的拦截器

export const pathFixer = {
    before(config){

        const {url} = config;

        if (typeof location != "undefined") {

            const {origin: pageOrigin, pathname: pagePathName} = location;

            //相对于当前html
            if (url.startsWith("./")) {
                const dirPath = pagePathName.split("/").slice(0, -1).join("/");
                let dir = pageOrigin + "/" + (dirPath || "");
                config.url = dir + "/" + url.substr(2);
            }

            //相对于跟
            if (url.startsWith("/")) {
                config.url = pageOrigin + url;
            }
        }
    }
}


export default [
    {
        key:"*",
        name:"pathFixer",
        data:{
            before(config){

                const {url} = config;

                if (typeof location != "undefined") {

                    const {origin: pageOrigin, pathname: pagePathName} = location;

                    //相对于当前html
                    if (url.startsWith("./")) {
                        const dirPath = pagePathName.split("/").slice(0, -1).join("/");
                        let dir = pageOrigin + "/" + (dirPath || "");
                        config.url = dir + "/" + url.substr(2);
                    }

                    //相对于跟
                    if (url.startsWith("/")) {
                        config.url = pageOrigin + url;
                    }
                }
            }
        }
    }
]