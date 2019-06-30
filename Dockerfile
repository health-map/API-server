FROM node:12.5

RUN apt-get update

#INSTALL supervisord
RUN apt-get install --no-install-recommends -y wget nano curl supervisor make g++ bzip2 software-properties-common

# Config supervisor
RUN mkdir -p /var/log/supervisor

RUN rm -rf /var/lib/apt/lists/*

WORKDIR /api

ADD . /api

RUN npm install 

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8020 9001

CMD supervisord
