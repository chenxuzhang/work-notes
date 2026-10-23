# Docker 常用运维排查命令速查

## 1. 容器排查
```bash
# 查看正在运行的容器及资源占用（CPU/内存）
docker stats

# 实时查看最后 100 行日志并持续跟踪
docker logs -f -n 100 <container_id_or_name>

# 进入容器终端
docker exec -it <container_id_or_name> /bin/sh
```

## 2. 清理磁盘空间
```bash
# 清理所有悬空的未打标签镜像
docker image prune -f

# 一键清理所有停止的容器、未使用的网络和无标签镜像
docker system prune -a --volumes
```
