# 使用 Python 3.11 和 Debian Bullseye (slim 版本) 作为基础镜像
FROM python:3.11-slim-bullseye

# 安装系统依赖和编译工具
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    supervisor \
    gcc \
    libmagic1 \
    ffmpeg \
    build-essential && \
    rm -rf /var/lib/apt/lists/*  

ENV PATH="/home/sysop/.local/bin:$PATH"

# 创建用户 sysop
RUN adduser --disabled-password --gecos '' sysop
RUN mkdir /app
RUN chown -R sysop:sysop /app

# 使用 sysop 用户
USER sysop
WORKDIR /app

# 仅复制 requirements.txt 文件，以利用 Docker 缓存
COPY requirements.txt /app

# 安装 requirements.txt 中的依赖包
RUN pip install -U pip && \
    pip install --no-cache-dir -r requirements.txt

# 将当前目录内容复制到容器中的 /app 目录
COPY . /app

# 开放 8000 端口
EXPOSE 8000

CMD ["/usr/bin/supervisord"]