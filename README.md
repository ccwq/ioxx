# ioxx 

一个可以让你更加简单的进行AJAX请求的工具, 基于axios

项目地址：https://github.com/ccwq/ioxx

-   特点
    -   语义化的请求方式
    
        //伪代码
        ```
        ioxx.请求的路径.请求方式(发送数据).then(结果=>{
            //处理结果
        })
        ```
      
        使用async/await，代码更加简洁
        ```
        let 请求结果 = await ioxx.请求路径.请求方式(发送数据)
        ```

    -   拥有功能强大的拦截器特性，按照请求的地址进行拦截
    
        ```javascript
        
        //响应之后对axios的响应数据进行读取/修改/延迟
        ioxx.addInterceptors("user/info", resp=>{
            store.commit("setUser", resp.data);
        })

        //同时拦截请求和相应
        ioxx.addInterceptors("user/info", {
            before(config){
                //请求延迟，等待十秒后，才进行请求
                return new Promise(resolve=>{
                    setTimeout(10000, resolve, config);
                })
            },
            after(response){
                //响应延时并修改相应内容
                return new Promise(resolve=>{
                    setTimeout(10000, _=>{
                        //对response进行一些耗时的操作
                        resolve(response);
                    });
                })
            }
        }) 
        
        ```
    -   请求代码数量缩减
        ```
        axios({
            url,
            method,
            data:{
                id
            }
        })
        ```
        
        ```
        ioxx.url.method({id})
        ```
        两者比较之下，ioxx可以做到更加简洁
        由于基于axios，ioxx也可以直接使用axios的方式进行请求
        
        ```javascript
        ioxx.$(axiosOptions)
        ```
        
    -   开箱即可请求 application/x-www-form-urlencoded 形式的数据，不知道最新版的这样，以前使用axios必须得加一堆配置，才可以是使用 

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
    }, axiosOptions)
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
    
    拦截器功能请查看特点介绍部分
    
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

<br>

##   文档

---
        
- ``$``转义的使用
    
    1.以``$``开头的方法会遵循另外一套简单的规则，如下
    ```javascript
    ioxx.$user_delete.post(); 
    //{url:"user/delete", method:"post"}
  
    ioxx.$super$_user_Post()
    //{url:"super_user/Post"}
    ```
    总结，所有``_``会转换为路径切割(除了``$_``)

    1.  放在大写字母前面会阻止大写字母被转义为路径分割
    ```javascript
    ioxx.superUserDelete()
    //{url:"super/user", method:"delete"}
    ```
    此时如果想要请求的地址是 "super/userDelete",可以使用 ``$`` 转义
    ```javascript
    ioxx.superUser$Delete();
    //也可以使用ioxx.superUserDDelete()//重复出现两次的大写字母会被缩减为1个
    ```

    1. 强制切割路径，放在非大写字母前面(包括小写字母，数字，下连字符)，会转换为一个连字符
    ```javascript
    ioxx.superUser$delete.post() // {url:"super/user/delete", method:"post"}
    ```

    