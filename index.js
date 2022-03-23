
//alert for making env file with firebase admin json.stringify becaue it add another forward slash for stringify


const express = require("express");
require('dotenv').config()
const cors = require('cors')
const databasename = process.env.databasename;
const usercollection = process.env.usercollection;
const admincollection = process.env.admincollection;
const servicecollection = process.env.servicecollection;
const appointmentcollection = process.env.appointmentcollection;
const username = process.env.doctorsportaluser;
const password = process.env.doctorsportalpassword;
const bodyParser = require('body-parser')

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${username}:${password}@cluster0.kar2i.mongodb.net/${databasename}?retryWrites=true&w=majority`;

const { initializeApp } = require('firebase-admin/app');

const admin = require("firebase-admin");
//first firebase file
// const serviceAccount =require("./doctors-portal-d918a-firebase-adminsdk-5s8k4-f153a9f9b9.json");
const serviceAccount=JSON.parse(process.env.FIREBASE);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const port = process.env.PORT || 5000;

const app = express()

app.use(cors())
app.use(express.json())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer")) {
    const token = req.headers?.authorization?.split("Bearer ")[1]
    try {
      const decodedUser = await admin.auth().verifyIdToken(token)
      req.decodedEmail = decodedUser.email;
    }
    catch {

    }

  }




  next()
}


async function run() {
  try {
    await client.connect();
    const userscollection = client.db(databasename).collection(usercollection);
    const adminscollection = client.db(databasename).collection(admincollection);
    const servicsecollection = client.db(databasename).collection(servicecollection);
    const appointmentscollection = client.db(databasename).collection(appointmentcollection);
app.get('/',(req,res)=>{
  res.send("Doctors Portal")
})
    //find all appointment using email and date
    app.get('/appointments', verifyToken, async (req, res) => {
      const email = req.query.email;
      const date = req.query.date;
      if (req.decodedEmail === email) {
        const response = await appointmentscollection.find({ "email": email, "date": date })
        const result = await response.toArray()
        res.send(result)
      }
      else {
        res.status(403).json({ message: "You Do Not have permission to do this operation" })
      }

    })
    //add booking to database
    app.post("/addBooking", async (req, res) => {
      const result = await appointmentscollection.insertOne(req.body)
      console.log(result);
      res.send(result)
    })
    //post method for adding new user
    app.post("/addUser", async (req, res) => {
      console.log("hitted by and api")
      const data = req.body;
      console.log(data)
      const result = await userscollection.insertOne(data)
      res.send(result)

    })
    // Upsert method for users
    app.put("/addUser", async (req, res) => {
      const data = req.body;
      const updateUser = { $set: data }
      const filter = { email: data.email }
      const options = { upsert: true }
      const result = await userscollection.updateOne(filter, updateUser, options)
      res.send(result)

    })


    app.put("/addAdmin", verifyToken, async (req, res) => {

      // idToken comes from the client app and check it using firebase
      const requester = req.decodedEmail
      if (requester) {
        const requesterAccount = await adminscollection.findOne({ email: requester })
        if (requesterAccount.role === "admin" || requesterAccount.role === "assistant_admin" || requesterAccount.role ===
          "owner") {
          const data = req.body;
          updateUser = { $set: data }
          filter = { email: data.email };
          options = { upsert: true };
          const result = await adminscollection.updateOne(filter, updateUser, options)
          res.send(result)

        }
      }
      else {
        res.status(403).json({ message: "You Dont Have Permission for This Operation" })
      }


    })

    app.get("/admins", async (req, res) => {
      console.log("Hitting admin collection")
      const result = await adminscollection.find({}).toArray()
      res.send(result)
    })
    app.get("/checkAdmin/:email", async (req, res) => {
      let admin = false;
      const query = { email: req.params.email }
      const result = await adminscollection.find(query).toArray()
      res.json({ admin: result?.length > 0 })
    })

  }
  //cathc error or do something after operation but not close
  finally {
    console.log("something went wrong")
    // await client.close();
  }


}
run().catch(console.dir);


app.listen(port, () => console.log("listening to port 5000"))