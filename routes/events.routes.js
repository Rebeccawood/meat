const express = require('express');
const router = express.Router();
const Event = require('../models/Event.model');
const User = require('../models/User.model');
const mailer = require('../configs/nodemailer.config')
const {
	ensureLoggedIn
} = require('connect-ensure-login');


// -------------------------- EVENT SHOW  --------------------------- //

router.get('/show', (req, res) => res.render('events/show'))

router.get('/create', ensureLoggedIn("/auth/login"), (req, res) => {
	Event.findById(req.params.id)
		.then(event => res.render('events/create', {
			event: event
		}))
})

router.post("/create", (req, res) => {
	const {

		name,
		description,
		type,
		glutenfree,
		dairyfree,
		veg,
		vegan,
		shellfish,
		nuts,
		date,
		time,
		address,
		forks
	} = req.body;

	const host = req.user

	Event.create({
			host,
			name,
			description,
			type,
			specs: {
				glutenfree,
				dairyfree,
				veg,
				vegan,
				shellfish,
				nuts
			},
			date,
			time,
			address,
			forks
		})
		.then(x => {
			res.redirect("/events/show");
			console.log(req.body);
		})
		.catch(err => console.log(err));
});
// Send email to accept the request.
router.get('/email/:id', (req, res) => {

	Event.findById(req.params.id)
		.populate("host")
		.then(theEvent => {

			const message = `<h4> Hello, ${theEvent.host.username} </h4><p>You have a new request for your event ${theEvent.name}!<br><br>You can checkout ${req.user._id}'s profile by clicking <a href="http://localhost:3000/profile/${req.user._id}">here!</a>If you would like to accept your guest, please click <a href="http://localhost:3000/events/confirm?host=${theEvent._id}&guestID=${req.user._id}">Accept</a><br> Otherwise, you can just ignore this email <br><br>We wish you fun at your event!<br><br>Your,<br><br><strong>M'EAT Team</strong>
</p>`


			mailer.sendMail({
					from: '"M\'EAT 👻" noreplyt@meat-app.com',
					to: `${theEvent.host.email}`, //El email del Host que va a celebrar el event
					subject: "New request for your event!!!",
					text: `https://ih-meat-app.herokuapp.com/events/confirm?host=${theEvent._id}&guestID=${req.user._id}`,
					html: `<b>https://ih-meat-app.herokuapp.com/events/confirm?host=${theEvent._id}&guestID=${req.user._id}</b>`
				})
				.then(x => res.render("events/requested"))
				.catch(err => console.log(err));
		})
})
// We need to push the guest to the event and the event to the guest, checking if they have been alread pushed.
router.get(`/lala`, (req, res) => res.render("events/confirm"))

router.get(`/confirm`, (req, res) => {
	let eventId = req.query.host
	let guestID = req.query.guestID
	console.log(guestID, "ID DEL GUEST A INCLUIR EN ARRAY")
	//Primera promesa, os la estudiais mamones. La guardas en una variable
	let firstFind =

		User.findOneAndUpdate({
			$and: [{
				_id: guestID
			}, {
				events: {
					$nin: eventId
				}
			}]
		}, {
			$push: {
				events: eventId
			}
		})
		.then(userUpdated => console.log(userUpdated, "user que ha sido actualizado"))
		.catch(err => console.log('seguro que la he cagao', err))
	// findOneAndUpdate(conditions, update, options, (error, doc) => {
	console.log(eventId)

	//Lo mismo. Las dos en un array, estudiad el promise all.
	let secondFind =
		Event.findOne({
			_id: eventId
		})
		.then(elm => {
			let newArr = elm.guests
			newArr.includes(guestID) ? null : newArr.push(guestID)
			console.log(newArr)
			Event.update({
					_id: eventId
				}, {
					guests: newArr
				})
				.then(info => {
					console.log(info, "info de findone de event")
				})
				.catch(err => console.log(err))

		})
		.catch(err => console.log(err));

	Promise.all([firstFind, secondFind])
		.then(x => res.render('events/confirm'), {
			user: req.user
		})
		.catch(err => console.log(err))


})


// ---------------------------------------- API ------------------------------------ //

router.get('/api', (req, res, next) => {
	Event.find()
		.then(allEventsFromDB => res.status(200).json({
			events: allEventsFromDB
		}))
		.catch(err => next(err))
});
router.get('/api/:id', (req, res, next) => {
	let eventId = req.params.id;
	console.log(eventId)
	Event.findOne({
		_id: eventId
	}, (error, oneEventFromDB) => {
		if (error) {
			next(error)
		} else {
			res.status(200).json({
				event: oneEventFromDB
			});
		}
	});
});


// -------------------------- EVENT DETAILS --------------------------- //
router.get("/:id", ensureLoggedIn("/auth/login"), (req, res) => {
	Event.findById(req.params.id)
		.populate("host")
		.populate('guests')
		.then(theEvent => {
			res.render("events/details", {
				event: theEvent
			});
		})
		.catch(err => console.log(err));
});
module.exports = router