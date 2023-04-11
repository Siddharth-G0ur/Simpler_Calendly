import express from "express"
import dotenv from "dotenv"
import { google } from 'googleapis'
import bodyParser from "body-parser";
const path = "./service-account-key.json"

dotenv.config()

const app = express();

app.use(bodyParser.json());

const PORT = 8000

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
app.post('/create_event', async (req, res) => {

    calendarAPI.events.insert({
        auth: oauth2Client,
        calendarId: 'primary',
        resource: req.body,
      }, function(err, event) {
        if (err) {
          res.send('There was an error contacting the Calendar service: ' + err);
          return;
        }
        res.json({"message":"Event Created"});
    });
    
})

// get the list of all the events
app.post('/get_list', async (req, res)=>{
    calendarAPI.events.list({
        auth:oauth2Client,
        calendarId: 'primary',
        timeMin: req.body.timeMin,
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      }, (err, res) => {
        if (err) return console.error('Error fetching events:', err);
        const events = JSON.stringify(res.data.items);
        console.log("list Of Events: ", events);
    });

    res.json({ "message":"Check Console" });
})

//check for the availability of the user
app.post('/get_availability', async (req, res) => {

    calendarService.freebusy.query({
        requestBody: req.body,
        auth: process.env.API_KEY,
      }, (err, res) => {
        if (err) return console.error('Error:', err);
        console.log('Busy slots:', JSON.stringify(res.data.calendars));
    });

    res.json({ "message":"Check Console" });
})

// checking for the availability of the user and creating the event
app.post('/schedule_meeting', async (req, res) => {
    
    calendarService.freebusy.query({
        requestBody: req.body.checkBusy,
        auth: process.env.API_KEY,
      }, (err, res) => {
        if (err) return console.error('Error:', err);

        // if there are many non host we can iterate and find all the non host calender
        const calendarId = req.body.checkBusy.items[0].id;

        const availability = JSON.stringify(res.data.calendars[calendarId].busy);

        if (availability.length <= 2) {
            // If we are not busy create a new calendar event.
            calendarAPI.events.insert({
                auth: oauth2Client,
                calendarId: 'primary',
                resource: req.body.event,
              }, function(err, event) {
                if (err) {
                  console.log('There was an error contacting the Calendar service: ' + err);
                  return;
                }
                 return console.log('Event successfully created.');
            });
        }
        else console.log("The Non Host is Busy")
    });
    res.json({ "message":"Check Console" });
})

app.listen(PORT, () => {
    console.log("app is running at", PORT);
})

