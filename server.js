const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODBURL, { useNewUrlParser: true })

const exerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: Date,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
})
const userSchema = new mongoose.Schema({
  username: String,
  exercises: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' }]
})

const User = mongoose.model('User', userSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema)

app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

app.get('/api/exercise/users', (req, res) => {
  User.find({})
    .populate('exercises')
    .exec((err, users) => {
      if (err) {
        res.send(err)
      }
      res.json(users)
    })
})

app.get('/api/exercise/log/', (req, res) => {
  User.findById(req.query.userId)
    .populate('exercises')
    .exec((err, user) => {
      if (!err && user) {
        var exercises = user.exercises
        var count = exercises.length
        var log = []

        for (let exercise of exercises) {
          log.push({
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date })
        }

        var response = {
          _id: user._id,
          username: user.username,
          count: count,
          log: log
        }

        res.json(response)
      } else {
        res.send("User doesn't exist")
      }
    })
})

app.post('/api/exercise/new-user', (req, res) => {
  var username = req.body.username

  User.findOne({ 'username': username }, function (err, user) {
    if (!err && user) {
      res.send('Username already taken')
    } else {
      var newUser = new User({ username: username })
      newUser.save(function (err, user) {
        if (err) return console.error(err)
        res.json(user)
      })
    }
  })
})

app.post('/api/exercise/add', (req, res) => {
  User.findById(req.body.userId, (err, user) => {
    if (!err && user) {
      var today = new Date()
      var exercise = {
        description: req.body.description,
        duration: req.body.duration,
        date: req.body.date ? req.body.date : today,
        user: user._id
      }
      var newExercise = new Exercise(exercise)
      newExercise.save((err, exercise) => {
        if (err) {
          res.send(err)
        } else {
          user.exercises.push(exercise._id)
          user.save((err, user) => {
            if (err) res.send(err)
          })
        }
      })
    } else {
      res.send("User doesn't exist")
    }
  })
    .populate('exercises')
    .exec((err, user) => {
      if (err) res.send(err)
      res.json(user)
    })
})

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' })
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
