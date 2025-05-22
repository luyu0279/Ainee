import express, { Application } from "express";
import cors from "cors";
import extractorRouter from "./routes/extractor";

const app: Application = express();

// 中间件
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// 使用路由
app.use("/api", extractorRouter);

// 设置端口
const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 3011;

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
