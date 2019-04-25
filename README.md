# ioxx 

一个可以让你更加简介的进行AJAX请求的工具库, 基于 axios

项目地址：https://github.com/ccwq/ioxx

-   安装
    ```
    npm install --save ioxx
    ```
    或者
    ```
    yarn add ioxx
    ```

-   配置示例/可以0配置
    
    ```javascript
    //request.js
    import Ioxx from "src/libs/ioxx";
    export default Ioxx({
    
        //不解释
        baseURL: config.baseURL,
    
        //相应之后的配置
        afterResponse(response){
        
            //如果相应的status不为空,就认为相应出错，抛出错误
            if(response.data.status){
                return Promise.reject(response);
            }
        },
    
        //请求之前的配置
        beforeRequest(config){
               
            //请求发送之前，为每个请求加上token
            config.headers.token = token;
            return config;
        },
    })
    ```
    
-   使用
    ```javascript
    import ioxx from "path/to/request.js"
    
    /**
    * 使用get方式请求 "user/info" 接口
    */
    ioxx.userInfo({
        headers:{
            token
        },
        params: {
            id
        }
    });
    //或者
    ioxx.userInfo.get({id})
    
    //或者
    ioxx.userInfo("get", {id})



    /**    
    * 使用post请求登录到 user/auth/login
    */
    ioxx.userAuthLogin.post({userName, password})

    //或者
    ioxx.userAuthLogin("post", {userName, password})

    //或者
    ioxx.userAuthLogin({
        method: "post",
        data: {userName, password},
    })
    
    //或者
    ioxx.userAuthLoginPost({
        data: {userName, password},
    })
    ```
    
-   特殊情况
    
    -   请求的地址有大写如 ``"superUser/login"``
        
        通用解决方式
        ```javascript
            ioxx.$({
                url:"sperUser/login"
            })
    
            //或者
            ioxx["$superUser/login"](axiosConfig);
        ```
        
        也可以使用转义方式避免User的U被识别为路径分割
        ```javascript
        ioxx.superUUserLogin()
        ```
        
-   文档
        
    待补充
    


