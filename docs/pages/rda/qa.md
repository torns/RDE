
#### 提示 Unrecognized application project, please use `$ rde create` to create one
在当前目录没有找到rda.config.js文件，请先确定执行目录是否正确


#### 如何排查问题
由于rde run执行的命令实际是在docker容器中执行的，这时候本地看不到当下执行的全部文件与环境情况；如果要排查，可以按照如下步骤执行：
* 运行rde serve启动容器
* 通过docker命令进入docker容器中排查，这里推荐使用[vscode-insiders](https://code.visualstudio.com/insiders/)
* 打开vscode-insiders后F1,找到attach to a container，选择对应的容器后
* 通过F1, open File，打开/home/rde目录，这时候你就可以看到运行时的全部文件了
* 你还可以通过vscode-insiders的terminal运行npm script，排查问题

> 常用docker命令可以参考：https://github.com/kaola-fed/RDE/wiki/docker-cheatsheet
