const express = require('express');
const mongoClient = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const {check, validationResult } = require('express-validator');
const JwtStrategy = require('passport-jwt').Strategy,
      ExtractJwt = require('passport-jwt').ExtractJwt
const passport = require('passport');
const dateTime = require('node-datetime');
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const mongo = require('mongodb');
const mongoosePaginate = require('mongoose-paginate-v2')
const https = require('https');
const fs = require('fs');
const cors = require('cors');





const app = express()
const _id = mongo._id;
const privateKey = fs.readFileSync('key.pem','utf8')
const certificate = fs.readFileSync('cert.pem','utf8')
const credentials = {key: privateKey, cert: certificate};
let httpsServer = https.createServer(credentials, app);




const url = 'mongodb+srv://SaurabhCouponApp:CouponApp@cluster0.vozdc.mongodb.net/DataBase?retryWrites=true&w=majority'
mongoClient.connect(url,{useNewUrlParser:'true',})
mongoClient.connection.on("error", err => {console.log("err", err)})
mongoClient.connection.on("connected", (err, res) => {console.log("mongoose is connected")})


var Schema = mongoClient.Schema
const user_register = Schema({
    userName       : {type:String, require: true },
    userEmail      : {type:String, require: true }, 
    PhoneNumber    : {type:Number, require: true },
    Password       : {type:String, require: true }, 
                });

const access_token = Schema({
    Access_Token: String,
    user_id     : String,
                    })

const Category = Schema({
    categoryID         : Number,
    categoryName       : String,
    categoryType       : String,
    categoryIcon       : {data: Buffer,contentType: String},
    createdAt          : {type:Date, default: Date.now},
    editedAt           : {type:Date, default: Date.now},
    CategoryImageId            : String,

    });

const soldSchema = Schema({
    soldName      : String,
    soldLocation  : Number,
    soldDescription: String, //
    soldPhone     : Number , // 
    soldWebsite   : String // link type 

    })

const Coupon = Schema({
    couponName       : String,
    description      : String,
    expiryDate       : {type:Date, default: Date.now},
    noOfUser         : Number,
    code             : Number, //
    soldInformation  : {ref:soldSchema},
    couponCategoryImageId    : String
    })


user_register.plugin(mongoosePaginate)
const userRegister = mongoClient.model('userData',user_register)
const accesstoken  = mongoClient.model('accesstoken',access_token)
const categories   = mongoClient.model('category', Category)
const coupons      = mongoClient.model('coupon',Coupon) 
const sold         = mongoClient.model('sold',soldSchema)


app.use(passport.initialize());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.json());
app.use(cors())   // if not in code error for frontend

app.get ('/', (req, res)=>{
  res.send ('home')
})


app.post ('/user/registration', check('userEmail','Reqired').isEmail(),
  check('userName','Reqired'), check('Password','Reqired'),
  check('PhoneNumber','Reqired'),(req, res) =>{
  const { Password, PhoneNumber, userEmail, userName } = req.body;
  
const errors = validationResult(req)
    if (!errors.isEmpty() ){
        return res.status(400).json({errors:errors.array() });    
    };
    


  userRegister.findOne({userEmail:userEmail},(err, example)=>{
    if (!PhoneNumber){
        return res.status(400).json({errors:'Phone Number Reqired', success: false });
      }

    else if (!userName){
        return res.status(400).json({errors:'userName Reqired', success: false });
      }

    else if (!userEmail){
        return res.status(400).json({errors:'userEmail Reqired', success: false });
      }

    else if (!Password){
        return res.status(400).json({errors:'Password Reqired', success: false });
      }

    if (err){
        console.log(err);      
    }
    if (example){
        return res.status(400).json({errors:'Not available', success: false });
    } else {

        const Example = new userRegister ({
                        "userName"            :`${req.body.userName}`,
                        "userEmail"           :`${req.body.userEmail}`,
                        "PhoneNumber"         :`${req.body.PhoneNumber}`,
                        "Password"            :`${Password}`,
        
                    })
        Example.save(); 
        res.status(200).json({"message":"Registration complete", success:true, data:{
          userName:userName, userEmail:userEmail, PhoneNumber:PhoneNumber, Password:Password, encryptPassword:encryptPassword}
        })
    }
  })
});

app.post('/user/login', check('userEmail','Email Reqired ').isEmail(),
check('Password') ,(req, res)=>{

    const userEmail  = req.body.userEmail;
    const Password   = req.body.Password;

    const admin = 'admin@gmail.com'
    const pass = '123456'    

    const errors = validationResult(req)
    if (!errors.isEmpty() ){
        return res.status(400).json({errors:errors.array() });    
    };
    

    userRegister.findOne({userEmail:userEmail},(err, token, )=>{

        if(token){
            const userID = token._id
            const name   = token.userName
            const phoneNo= token.PhoneNumber
            const email  = token.userEmail
            var Tokens   = jwt.sign({userEmail:userEmail},'secret', {expiresIn:'5h'});
            res.send({
                success       : true,
                Message       : "Login complete",
                data :{
                'user_id'     : token._id,
                'name'        : token.userName,
                'PhoneNo'     : token.PhoneNumber,
                'email'       : token.userEmail ,
                'accessToken' : Tokens,
                }
                    })
            const Example2 = new accesstoken({

                "Access_Token":`${Tokens}`,
                "user_id"     :`${userID}`
                             })
            Example2.save();



        } else {
            if(admin === userEmail && pass === Password){
              res.send({message:'admin Credentials '})
              console.log('whta ')
            } else {
            return res.status(400).json({errors:`Invalid Credentials`, success: false})
        }
      }
    })
});


var opts = {}
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = 'secret';

passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
    userRegister.findOne({userEmail:jwt_payload.userEmail}, function(err, user) {
        console.log('passport function jwt_payload--',jwt_payload.userEmail)
        if (err) { 
            return done(err, false);
        }
        if (user) {
            return done(null, user);
        } else {
            return done(null, false);
        }
    });  
 }));



let storage = new GridFsStorage({url,file: (req, file)=>{
        return new Promise(
            (resolve, reject)=>{
                const fileInfo = {
                    filename : file.originalname,
                    bucketName: "Icons",   
                }
                resolve(fileInfo)
            })
    }    
})
const upload = multer ({storage})

app.post('/Category',upload.single('icon'),(req, res)=>{
  const categoryName    = req.body.categoryName
  const categoryType    = req.body.categoryType
  //const categoryID      = req.body.categoryID
  const CategoryImageId = req.file.id   // icon
  console.log(CategoryImageId)
  const Example3 = new categories({
      //'categoryID':`${}` auto incretment function
      'categoryName'      :`${categoryName}`,
      'categoryType'      :`${categoryType}`,
      //'categoryID'        :`${categoryID}`,
      'CategoryImageId'   :`${CategoryImageId}`
          })
  Example3.save();

  res.send({ success: true, data:{categoryName:categoryName,
                    categoryType:categoryType, file:req.file, }
                    ,  })
})


app.post ('/coupon',upload.single('icon') ,passport.authenticate('jwt', { session: false }),  (req, res)=>{
  const couponName = req.body.couponName;
  const description = req.body.description ;
  const noOfUser = req.body.noOfUser;
  const soldName = req.body.soldName;
  const soldLocation = req.body.soldLocation;
  const couponCategoryImageId = req.file.id

  Example4 = new coupons({
    "couponName"   :`${couponName}`,
    "description"  :`${description}`,
    "noOfUser"     :`${noOfUser}`,
    "couponCategoryImageId":`${couponCategoryImageId}`,
    "code"          :`${code}`
  })
  Example4.save();

  Example5 = new  sold({
    "soldName":`${soldName}`,
    "soldLocation":`${soldLocation}`,
    "soldDescription":`${soldDescription}`,
    "soldPhone" : `${soldPhone}`,
    "soldWebsite":`${soldWebsite}`
  })

  Example5.save();

res.send({ data :{ 
        couponName:couponName, description:description, 
         noOfUser:noOfUser,code:code, 
         soldName:soldName, soldLocation:soldLocation,soldPhone:soldPhone, soldWebsite:soldWebsite, file:req.file }
       })
   })



app.get('/data-user' ,passport.authenticate('jwt', { session: false }), (req, res)=>{
  userRegister.find({},(err, user)=>{
    if (user){
      console.log(user)
      const rest = user
    } 
  })
 

});

app.get('/data-Category', (req, res)=>{
 categories.find({},(err,user)=>{
  if(user){
    console.log(user)
    const west = user
    res.send({data:{couponData:west}})
  } else {
    res.status(400)
  }
 }) 
})

app.get('/data-coupon',passport.authenticate('jwt', { session: false }), (req, res)=>{
 coupons.find({},(err,user)=>{
  if(user){
    const west = user
    sold.find({},(err,sold)=>{
      if(sold){
        const locate = sold
    res.send({data:{couponData:west, sellerData:locate}})
      }
    })
  } else {
    res.status(400)
  }
 }) 
})

app.post('/editProfile',passport.authenticate('jwt', { session: false }),async (req, res)=>{

const filter = {userName:req.body.userName};
const update = {PhoneNumber: req.body.PhoneNumber};

let doc = await userRegister.findOneAndUpdate(filter,update,{new:true});
console.log(doc.userName)
console.log(doc.PhoneNumber)
res.send({success:true,data:{updatedPhoneNo:update}})
 
 })

app.post('/editCoupon',passport.authenticate('jwt', { session: false }),async (req, res)=>{

const filter = {couponName:req.body.couponName};
const update = {description: req.body.description};

let doc = await coupons.findOneAndUpdate(filter,update,{new:true});
console.log(doc.couponName)
console.log(doc.description)
 })


app.post('/editCategories',passport.authenticate('jwt', { session: false }),async (req, res)=>{

const filter = {categoryName:req.body.couponName};
const update = {categoryType: req.body.categoryType};

let doc = await categories.findOneAndUpdate(filter,update,{new:true});
console.log(doc.couponName)
console.log(doc.description)
 })


app.put('/user/delete',passport.authenticate('jwt', { session: false }),(req, res)=>{
    const{_id} = req.body;
    userRegister.findOneAndDelete({_id:_id},(err,wipe)=>{
        if(wipe){
        res.send({
            'Message':'Data deleted'
            })
    } else {
        return res.status(500).json({errors:'No data found'})
    }

    })
})


app.put('/coupon/delete',passport.authenticate('jwt', { session: false }),(req, res)=>{
    const{_id} = req.body;
    coupons.findOneAndDelete({_id:_id},(err,wipe)=>{
        if(wipe){
        res.send({
            'Message':'Data deleted'
            })
    } else {
        return res.status(500).json({errors:'No data found'})
    }

    })
})

app.put('/categories/delete',passport.authenticate('jwt', { session: false }),(req, res)=>{
    const{_id} = req.body;
    categories.findOneAndDelete({_id:_id},(err,wipe)=>{
        if(wipe){
        res.send({
            'Message':'Data deleted'
            })
    } else {
        return res.status(500).json({errors:'No data found'})
    }

    })
})




app.get('/user/list/', async (req, res, next)=>{
    dataUser.paginate({},{page:req.query.page, limit:10})
    .then(response=>{
        res.json({
            response
        })
    }) .catch(error=>{
        res.status(400).json({
            error
        })
    }) 

 });

// Suggestion - logout aPI to delete access token while loging in! 

httpsServer.listen(8080,()=>{
    console.log('listened')
});



module.exports = app;