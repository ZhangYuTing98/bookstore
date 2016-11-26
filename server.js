var http = require('http'), // 创建服务器
    url = require('url'),
    fs = require('fs'),
    mime = require('mime');
http.createServer(function (req, res) {
    var urlObj = url.parse(req.url, true),
        pathname = urlObj.pathname;
    if (pathname == '/') {
        res.setHeader('content-type', 'text/html;charset=utf-8;');
        fs.createReadStream('./index.html').pipe(res);
    } else if (/^\/book(\/\d+)?$/.test(pathname)) { // 相当于 /book/\d+
        // restful风格 根据method和传入的值来判断是增删改查的哪一种
        var matcher = pathname.match(/^\/book(\/\d+)?$/)[1]; // 如果matcher存在 说明传递了参数
        switch (req.method) {
            case 'GET':
                if (matcher) {
                    // 获取传入的id
                    var id = matcher.slice(1);
                    getBooks(function (data) {
                        // 去所有书中找到id匹配的那一本书
                        var book = data.find(function (item) {
                            return item.id == id;
                        });
                        res.end(JSON.stringify(book));
                    });
                } else {
                    getBooks(function (data) {
                        res.setHeader('content-type', 'application/json;charset=utf-8;');
                        res.end(JSON.stringify(data));
                    })
                }
                break;
            case 'PUT':
                // 在url中获取id 在请求体中获取数据
                if (matcher) {
                    var bookid = matcher.slice(1); // 需要更改图书的id号
                    var result = '';
                    req.on('data', function (data) {
                        result += data;
                    });
                    req.on('end', function () {
                        var book = JSON.parse(result).book; // 把那个id的内容改成什么
                        getBooks(function (data) {
                            data = data.map(function (item) {
                                if (item.id == bookid) {
                                    return book; // 替换操作
                                }
                                return item;
                            });
                            setBooks(data, function () {
                                res.end(JSON.stringify(book));
                            })
                        })
                    })
                }
                break;
            case 'DELETE':
                // 要获取传入的id
                if (matcher) {
                    var bookid = matcher.slice(1);
                    getBooks(function (data) {
                        data = data.filter(function (item) {
                            return item.id != bookid;
                        });
                        setBooks(data, function () {
                            res.end(JSON.stringify({}));
                        });
                    });
                }
                break;
            case 'POST':
                // 获取传过来的请求体 req可读流
                var result = '';
                req.on('data', function (data) {
                    result += data;
                });
                req.on('end', function () {
                    var book = JSON.parse(result); // 获取数据后 写入到JSON文件中
                    getBooks(function (data) {
                        // 如果没有数据则为1 有的话取数组的最后一项的id + 1
                        book.id = !data.length ? 1 : data[data.length - 1].id + 1; // 加一个id属性作为每本书唯一的标识
                        data.push(book);
                        setBooks(data, function () {
                            // 增加方法需要返回增加的那一项
                            res.end(JSON.stringify(book));
                        });
                    });
                });
                break;
        }
    } else {
        fs.exists('.' + pathname, function (exists) {
            if (exists) {
                res.setHeader('content-type', mime.lookup(pathname) + ';charset=utf-8;');
                fs.createReadStream('.' + pathname).pipe(res);
            } else {
                res.statusCode = 404;
                res.end('');
            }
        })
    }
}).listen(3456);

// 将内容写到book.json中
function setBooks(data, callback) {
    fs.writeFile('./book.json', JSON.stringify(data), callback);
}
// 从book.json中读取
function getBooks(callback) {
    fs.readFile('./book.json', 'utf-8', function (err, data) {
        var books = [];
        if (err) {
            callback(books);
        } else {
            if (data.startsWith('[')) {
                books = JSON.parse(data);
            }
            callback(books);
        }
    });
}
getBooks(function (data) {

});