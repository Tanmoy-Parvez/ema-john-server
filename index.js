const express = require("express");
const cors = require("cors");
const { MongoClient } = require('mongodb');
var admin = require("firebase-admin");
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wh888.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


var serviceAccount = require('./ema-john-2021-7cfe6-firebase-adminsdk-9c50g-3463982885.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(idToken)
            req.decodedUserEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}


async function run() {
    try {
        await client.connect();
        const database = client.db("onlineShop");
        const productCollection = database.collection("products")
        const orderCollection = database.collection("orders")
        // GET API -- Load data from database
        app.get("/products", async (req, res) => {
            const cursor = productCollection.find({})
            const count = await cursor.count();
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                products = await cursor.toArray();
            }
            res.send({
                count,
                products
            });
        })

        // POST to get data
        app.post("/products/byKeys", async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } }
            const products = await productCollection.find(query).toArray();
            res.json(products);
        })

        // POST to set order data
        app.post("/order", async (req, res) => {
            const order = req.body;
            order.createdAt = new Date();
            const result = await orderCollection.insertOne(order)
            res.json(result);
        })

        app.get("/myorder", verifyToken, async (req, res) => {
            const email = req.query.email;
            if (req.decodedUser === email) {
                const query = { email: email }
                const cursor = orderCollection.find(query)
                const result = await cursor.toArray()
                res.json(result)
            }
            else {
                res.status(401).json({ message: 'User not recognized' })
            }
        })
    }
    finally {
        //    await client.close();
    }
}

run().catch(console.dir)

app.get("/", (req, res) => {
    res.send("Ema john server  is running");
});

app.listen(port, () => {
    console.log("listening on port", port);
});


