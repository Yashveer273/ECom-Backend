
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const app = express();

app.use(cors());
app.use(express.json());
const bodyParser = require("body-parser");
app.use(bodyParser.json());
// ---------------------------------------------------------
const productRoutes = require("./routes/productRoutes");
const authRoutes=require("./routes/authRoutes");

connectDB();


app.use("/auth",authRoutes );
app.use("/api/products", productRoutes);
app.get("/", (req, res) => {
  res.send("Server Running ✅");
});

const PORT =  5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
