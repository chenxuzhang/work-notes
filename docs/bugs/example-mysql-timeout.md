# MySQL 查询超时与索引隐式失效排查

## 问题现象
接口突发 `504 Gateway Timeout`，查看慢查询日志发现一条针对 `user` 表的简单单条查询耗时超过 3 秒。

```sql
SELECT * FROM t_user WHERE phone_number = 13800000000;
```

## 原因分析
`phone_number` 字段在数据库定义为 `VARCHAR(20)`，但代码里传的值是整型数字 `13800000000`。
MySQL 发生了**隐式类型转换**（将字符串列每行调用转换函数转成数字后再比较），导致无法走 `idx_phone` 索引，触发全表扫描。

## 解决办法
修改应用层代码，强制传字符串类型，SQL 加上单引号：

```sql
-- 正确写法：走 idx_phone 索引，耗时从 3.2s 降为 2ms
SELECT * FROM t_user WHERE phone_number = '13800000000';
```

## 注意事项
* 凡是 `VARCHAR` 类型的字段做查询，传参必须带引号，避免触发 MySQL 隐式转换致使索引失效。
