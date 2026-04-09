FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
#: Thực tế dự án ko run ở đây
#: B1: Tạo dockerfile tương ứng
#: B2: Build Image (build lại toàn bộ môi trường) - docker build . (tự động tìm file Docker để làm việc)
#: 


