'user strcit';
module.exports = (app,db) => {
    
    //Front End entry page
    /**
     * GET /
     * @summary Front End Entry Page
     * @tags frontend
     * @param {string} message.query - a message to present to the user
     */
    app.get('/', (req,res) =>{
        console.log(req.session);
        // ✅ منع قبول message من URL - استخدم رسالة ثابتة فقط
        const message = "Please log in to continue"
        res.render('user.html', {message : message});
    });

    //Front End register page
    /**
     * GET /register
     * @summary Front End Register Page 
     * @tags frontend
     * @param {string} message.query - a message to present to the user
     */
    app.get('/register', (req,res) =>{
        // ✅ منع قبول message من URL - استخدم رسالة ثابتة فقط
        const message = "Please log in to continue"
        res.render('user-register.html', {message : message});
    });

    //Front End route to Register
    /**
     * GET /registerform
     * @summary Register form submission
     * @tags frontend
     * @param {string} email.query.required - email body parameter
     * @param {string} password.query.required - password body parameter
     * @param {string} name.query.required - name body parameter
     * @param {string} address.query.required - address body parameter
     */
     app.get('/registerform', (req,res) =>{
        
        const userEmail = req.query.email;
        const userName = req.query.name;
        const userRole = 'user'
        const userPassword = req.query.password;
        const userAddress = req.query.address
        
        //validate email using regular expression
        var emailExpression = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        if (!emailExpression.test(userEmail)){
            res.redirect("/register?message=Email coulden't be validated, please try again.")
            return
        }
        
        const md5 = require('md5')
        const new_user = db.user.create({
            name:userName,
            email:userEmail,
            role:userRole,
            address:userAddress,
            password:md5(userPassword)
        }).then(new_user => {
            req.session.user = { id: new_user.id, email: new_user.email };
            req.session.logged = true;
            res.redirect('/profile');
        }).catch((e) => {
            console.log(e)
            res.redirect('/?message=Error registering, please try again')
        })
    });

    //Front End route to log in
    /**
     * GET /login
     * @summary Login form submission
     * @tags frontend
     * @param {string} email.query.required - email body parameter
     * @param {string} password.query.required - password body parameter
     */
     app.get('/login', (req,res) =>{
        var userEmail = req.query.email;
        var userPassword = req.query.password;
        
        const user = db.user.findAll({
            where: {
                email: userEmail
            }
        }).then(user => {
            if(user.length == 0){
                res.redirect('/?message=Password was not found! Please Try again')
                return;
            }

            const md5 = require('md5')
            //compare password with and without hash
            if((user[0].password == userPassword) || (md5(user[0].password) == userPassword)){
                req.session.user = { id: user[0].id, email: user[0].email };
                req.session.logged = true;
                res.redirect('/profile');
                return;
            }
            res.redirect('/?message=Password was not correct, please try again')
        })
    });

    //Front End route to profile
    /**
     * GET /profile
     * @summary User Profile Page
     * @tags frontend
     * @param {string} message.query - a message to present to the user
     */
     app.get('/profile', (req,res) =>{

        if(!req.session.user || !req.session.logged) {
            res.redirect("/?message=Could not Access profile please log in or register")
            return;
        }

        const userId = req.session.user.id;

        const user = db.user.findAll({
            include: 'beers',
            where: {
                id: userId
            }
        }).then(user => {
            if(user.length == 0){
                res.redirect('/?message=User not found, please log in')
                return;
            }
            
            db.beer.findAll().then(beers => {
                console.log(user)
                console.log(beers)

                res.render('profile.html',
                {beers : beers, user:user[0]});        
            })
        })
        .catch(e => {
            res.redirect('/?message=Error loading profile')
        });
    });

    //Front End route to beer page
    /**
     * GET /beer
     * @summary Beer Details Page
     * @tags frontend
     * @param {number} id.query.required - Id number of the beer
     * @param {number} user.query.required - User id number of user viewing the page
     * @param {string} relationship - The message a user get when loving a beer
     */
     app.get('/beer', (req,res) =>{

        if(!req.query.id){
            res.redirect("/?message=Could not Access beer please try a different beer")
            return;
        }

        if(!req.session.user || !req.session.logged) {
            res.redirect("/?message=Please log in to view beers")
            return;
        }

        const beer = db.beer.findAll({
            include: 'users',
            where: {
                id: req.query.id
            }
        }).then(beer => {
            if(beer.length == 0){
                res.redirect('/?message=Beer not found, please try again')
                return;
            }

            const userId = req.session.user.id;

            db.user.findOne({where:{id: userId}}).then(user => {
                if(!user){
                    res.redirect('/?message=User not found, please try again')
                    return;
                }

                user.hasBeer(beer[0]).then(result => {
                    let love_message
                    if(result) {
                        love_message = "You Love THIS BEER!!"
                    }
                    else {
                        love_message = "..."
                    }
                    
                    if(req.query.relationship){
                        love_message = req.query.relationship
                    }

                    res.render('beer.html',
                        {beers : beer, message:love_message, user:user});     
                })
                .catch(e => {
                    res.redirect('/?message=Error loading beer')
                });
            });
        })
        .catch(e => {
            res.redirect('/?message=Error finding beer')
        });
    });
};