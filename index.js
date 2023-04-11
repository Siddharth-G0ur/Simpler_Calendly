import express from "express"
import dotenv from "dotenv"
import { google } from 'googleapis'
import bodyParser from "body-parser";
const path = "./service-account-key.json"


dotenv.config()

const app = express();

app.use(bodyParser.json());

const PORT = process.env.PORT || 8000

const scopes = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.readonly'];

const oauth2Client = new google.auth.OAuth2(
    process.env.YOUR_CLIENT_ID,
    process.env.YOUR_CLIENT_SECRET,
    process.env.YOUR_REDIRECT_URL
);

const calendarAPI = google.calendar({
    version: 'v3',
    auth: process.env.API_KEY 
    
}); 

const serviceAuth = new google.auth.GoogleAuth({
    keyFile: path,
    scopes: scopes,
}).getClient()

const calendarService = google.calendar({
    version: 'v3',
    auth: serviceAuth,
});
  
// authenticate the user
app.get('/google_authentication', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/calendar'
    });
    
    res.redirect(url);
    
});

//redirect the authenticated user to protected page
app.get('/google/redirect', async (req, res) => {

    const code = req.query.code;
    
    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens)  
    
    res.json({"message":"logged in"})
})

// create an event
app.post('/schedule_meeting', async (req, res) => {

    calendarAPI.events.insert({
        auth: oauth2Client,
        calendarId: 'primary',
        resource: req.body,
      }, function(err, event) {
        if (err) {
          res.send('There was an error contacting the Calendar service: ' + err);
          return;
        }
        res.json({"message":"success"});
    });
    
})

// get the list of all the events
app.get('/get_list', async (req, res)=>{
    calendarAPI.events.list({
        auth:oauth2Client,
        calendarId: 'primary',
        timeMin: "2023-04-10T11:50:21.000Z",
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      }, (err, res) => {
        if (err) return console.error('Error fetching events:', err);
        const events = res.data.items;
        console.log(res.data.items);
    });
   res.json({"message":"success"})
})

// const calendarId = 'hjain1904@gmail.com';

// const requestBody = {
//     timeMin: '2023-04-08T11:50:21.000Z',
//     timeMax: '2023-04-11T11:50:21.000Z',
//     timeZone: 'Asia/Kolkata',
//     calendarExpansion:'5',
//     items: [{id: calendarId}]
//   };


//check for the availability of the user
app.post('/get_availability', async (req, res) => {

    calendarService.freebusy.query({
        requestBody: req.body,
        auth: process.env.API_KEY,
      }, (err, res) => {
        if (err) return console.error('Error:', err);
        console.log('Busy slots:', JSON.stringify(res.data.calendars));
    });
    res.end();

})




app.listen(PORT, () => {
    console.log("app is running at", PORT);
})

