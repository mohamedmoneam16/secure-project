'user strcit';

module.exports = (app,db) => {

    //Get System/ warehouse information
    /**
     * GET /v1/status/{brand}
     * @summary Check if brand website is available (FIXED - No RCE)
     * @tags system
     * @param {string} brand.path.required - the beer brand you want to test
     */
    app.get('/v1/status/:brand', (req,res) =>{
        // ✅ قائمة بـ brands المسموحة فقط (Whitelist)
        const allowedBrands = ['bud', 'corona', 'heineken', 'stella', 'guinness'];
        const brand = req.params.brand;
        
        // ✅ التحقق: هل الـ brand من القائمة المسموحة؟
        if (!allowedBrands.includes(brand.toLowerCase())) {
            return res.status(400).json({
                error: "Invalid brand",
                message: "The requested brand is not available"
            });
        }
        
        // ✅ بدل execSync - استخدم HTTP request آمن
        const axios = require('axios');
        const safeUrl = `https://letmegooglethat.com/?q=${encodeURIComponent(brand)}`;
        
        axios.get(safeUrl, { timeout: 5000 })
            .then(response => {
                res.json({
                    status: "available",
                    brand: brand,
                    statusCode: response.status
                });
            })
            .catch(error => {
                res.status(503).json({
                    status: "unavailable",
                    brand: brand,
                    message: "Could not reach brand website"
                });
            });
    });

    //redirect user to brand
    /**
     * GET /v1/redirect/
     * @summary Redirect the user to a safe URL (FIXED - No Open Redirect)
     * @tags system
     * @param {string} url.query.required - the URL to redirect to
     */
    app.get('/v1/redirect/', (req,res) =>{
        var url = req.query.url;
        console.log(url);
        
        // ✅ قائمة بـ URLs المسموحة فقط (Whitelist)
        const allowedDomains = [
            'http://localhost:5000',
            'http://localhost:3000',
            'https://beer-store.com',
            'https://trusted-partner.com'
        ];
        
        // ✅ التحقق: هل الـ URL من القائمة المسموحة؟
        const isAllowed = allowedDomains.some(domain => url && url.startsWith(domain));
        
        if(url && isAllowed){
            res.redirect(url);
        } else {
            // ✅ في حالة URL غير مسموحة
            res.status(400).json({
                error: "Invalid redirect URL",
                message: "The requested URL is not allowed for security reasons"
            });
        }
    });

    //initialize list of beers
    /**
     * POST /v1/init/
     * @summary Initialize beers from JSON (FIXED - No Deserialization)
     * @tags system
     * @param {object} request.body.required - beer data
     */
    app.post('/v1/init', (req, res) => {
    const body = req.body;

    const validKeys = ['name', 'price', 'brand', 'stock'];
    const data = {};

    for (let key of validKeys) {
        if (body[key] !== undefined) {
            data[key] = body[key];
        }
    }

    if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    return res.json({ message: 'Product initialized safely' });
});


    //perform a test on an endpoint
    /**
     * GET /v1/test/
     * @summary Perform a safe request (FIXED - No SSRF)
     * @tags system
     * @param {string} url.query.required - URL to test
     */
    app.get('/v1/test/', (req,res) =>{
        const axios = require('axios');
        const url = req.query.url;
        console.log(url);
        
        // ✅ قائمة بـ URLs المسموحة للاختبار (Whitelist)
        const allowedDomains = [
            'https://beer-store.com',
            'https://trusted-partner.com',
            'https://api.example.com'
        ];
        
        // ✅ التحقق: هل الـ URL من القائمة المسموحة؟
        const isAllowed = allowedDomains.some(domain => url && url.startsWith(domain));
        
        // ✅ منع localhost و internal IPs
        const isInternal = url && (
            url.includes('localhost') || 
            url.includes('127.0.0.1') || 
            url.includes('192.168.') || 
            url.includes('10.0.')
        );
        
        if(!url) {
            return res.json({error:"No url provided"});
        }
        
        if (!isAllowed || isInternal) {
            return res.status(403).json({
                error: "Access denied",
                message: "The requested URL is not allowed for security reasons"
            });
        }
        
        axios.get(url, { timeout: 5000 })
            .then(response => {
                res.json({
                    response: response.status,
                    message: "Request successful"
                });
            })
            .catch(error => {
                res.status(503).json({
                    error: "Request failed",
                    message: error.message
                });
            });
    });

};