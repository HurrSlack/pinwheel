const path = require("path");
const textToImage = require("text-to-image");
const express = require("express");

const app = express();

const fields = [
  ["text"],
  ["maxWidth", "number"],
  ["fontSize", "number"],
  ["fontFamily"],
  ["fontWeight"],
  ["lineHeight", "number"],
  ["textAlign"],
  ["margin", "number"],
  ["bgColor", "color"],
  ["textColor", "color"],
];

const defaults = {
  text: "order corn",
  maxWidth: 360,
  fontSize: 18,
  fontWeight: "normal",
  fontFamily: "Helvetica",
  lineHeight: 24,
  margin: 5,
  textAlign: "left",
  bgColor: "#333355",
  textColor: "#e4fff3",
};

app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  const query = { ...defaults, ...req.query };
  for (const [id, type] of fields) {
    if (type === "number") {
      query[id] = Number(query[id]);
    }
  }
  const { text, ...config } = query;
  const dataUri = await textToImage.generate(text, config);
  res.render("harness", { dataUri, fields, query });
});

app.get("/harness.css", (req, res) =>
  res.sendFile(path.join(__dirname, "harness.css"))
);

app.listen(3001, () => {
  console.log("http://localhost:3001");
});
