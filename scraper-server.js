const express = require('express');
const request = require('request');
const cheerio = require('cheerio');
const app     = express();
const async   = require('async');

const baseURL = "http://www.readcomics.tv/";

app.get('/', function(req,res){
    res.type('text/plain');
    res.send("Hello Comic Fan");   
});
    
//TODO: Need an newly updated get request for homepage
//Get request to get all comics on the website in Alpha/ Numberic order
app.get('/comic-list-AZ', function(req, res){
  //URL to hit for all the comics A-Z
  var url = baseURL + "comic-list";
  
  request(url, function(error, response, html){
        // First we'll check to make sure no errors occurred when making the request
        if(!error){
            // Var to hold all the comic information 
            var comics = []
            // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality
            var $ = cheerio.load(html);

            $('.container').find('li').each(function(){
                  //Only has the title and link present here 
                  var json = { 
                      title: "", 
                      link: "",
                      category:""
                     };

                  json.title = $(this).children().text();
                  json.link = $(this).children().attr('href').toString();
                  var category = $(this).parent().siblings('div').text();
                  //Add comic to correct category
                  if(category == "#" || !isNaN(category)){
                      json.category = "#";
                  }else{
                      json.category = category;
                  }

                comics.push(json);
            });
        }
        //Return the Array of all the JSON comic objects
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(comics,null, 3));
    });
});

//TODO: Could ask for page number?
//GET method to receive list of popular comics
app.get('/popular-comics/:pageNumber', function(req, res){
    //Url to hit
    var url = baseURL + 'popular-comic/' + req.params.pageNumber;
    request(url, function(error, response, html){
        // First we'll check to make sure no errors occurred when making the request
        if(!error){
            // Var to hold all the comic information 
            var comics = [];
            // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality
            var $ = cheerio.load(html);

            $('.manga-box').each(function(){
                //This page has more fields to pick from. 
                var json = { 
                    title: "", 
                    link: "",
                    img: "", 
                    genre: []
                };

                json.title = $(this).find('h3').children().text();
                json.link = $(this).find('h3').children().attr('href');
                json.img = $(this).find('img').attr('src').toString();
                //Loop through all possible genres

                $(this).find('.tags').each(function(){
                    var genreJson = {
                        name: "",
                        genreLink: ""
                    };
                    genreJson.name = $(this).text();
                    genreJson.genreLink = $(this).attr('href');
                    json.genre.push(genreJson);
                });

                //Add to comics array
                comics.push(json);
        });

        }
        //Return the Created JSON Dictionary. 
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(comics,null, 3));

    });

});

//GET method to return the list of all Issue of a Comic 
app.get('/list-issues/:comicName', function(req, res){

    var url = baseURL +'comic/' + req.params.comicName;

    request(url, function(error, response, html){
        // First we'll check to make sure no errors occurred when making the request
        if(!error){
            var listOfIssues = [];

            var $ = cheerio.load(html);

            $('.basic-list').children().each(function(){

                var json = {
                    chapterName: "", 
                    link: "",
                    releaseDate: ""
                };

                json.link = $(this).children('a').attr('href');
                //Null check and make sure its a link to reading 
                json.chapterName = $(this).children('a').text();
                json.releaseDate = $(this).children('span').text();
                listOfIssues.push(json);
            });
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(listOfIssues,null, 3));
    });
});

//GET request to get the images for a provided Comic Issue 
app.get('/read-comic/:comicName/:chapterNumber', function(req, res){
    //Removes the .html off it 
    var url = baseURL + req.params.comicName + '/chapter-' + req.params.chapterNumber;
    var pageURLs = [];
    var numOfPages = -1; 

    //Gets the number of pages and the first page information
    request(url, function(error, response, html){
        if(!error){
            var $ = cheerio.load(html);
            //Get the number of pages
            numOfPages = $('.full-select').last().children().length;

            //Create the links for each page
            for(i=1; i <= numOfPages; i++ ){
                pageURLs.push(url + "/"+ i);
            }

            //Asycn function to get all off the pictures and return them
            async.map(pageURLs, getComicImage, function (err, data){
                if (err) return console.log(err);
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(data,null, 3));
            });
        }
    });

});

//Iteratior method to get the Image from a given url 
function getComicImage(url, callback) {
    request(url, function(err, res, html) {
        if(!err){
            var $ = cheerio.load(html);
            var imageUrl = $('#main_img').attr('src');
            callback(err, imageUrl);
        }
    });
}

app.get("/:comicName/description",function(req, res){
    var url = baseURL + "comic/" + req.params.comicName;
    var jsonDesc = {
        description:"",
        largeImg:"",
    };
    request(url,function(error, response, html){
        if(!error){
            var $ = cheerio.load(html);
            $('.manga-details').find('tr').each(function(){
                var input = $(this).last().children().text().replace(/(\r\n|\n|\r|\t)/gm,"").split(":");
                var value = input[1].trim();
                if(input.length == 3){
                    value += ": " + input[2].trim();
                }
                var key = input[0].charAt(0).toLowerCase(0) + input[0].slice(1);
                jsonDesc[key] = value;
            });
            jsonDesc.largeImg = $('.manga-image').children('img').attr('src');
            var descript = $('.pdesc').text().replace(/(\r\n|\n|\r|\t)/gm,"");
            jsonDesc.description = descript.trim();
            res.setHeader('Content-Type',"application/json");
            res.send(JSON.stringify(jsonDesc, null, 3));
        }
    });
});


// Search functionality for the website. Methods that help with it and perform it
app.get('/search-categories', function(req, res){
    var url = baseURL + 'advanced-search';

    var categories = [];
    request(url, function(error, response, html){
        if(!error){
            var $ = cheerio.load(html);

            $('.search-checks').children('li').each(function(){
                categories.push($(this).text());
            });

            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(categories,null, 3));
        }
    });
});

//Four main things to search on, place null in request url when not using it
// Key == User typed in
// wg == category user wants to be found
// wog == category user doesn't wants
// status == Ongoing, Complete or doesn't matter 
app.get('/advanced-search/:key/:wg?/:wog?/:status?',function(req, res){
    var url = baseURL + 'advanced-search?key=' +req.params.key;

    //Checks if wg, wog, status were provided or not
    if(req.params.wg !== undefined && req.params.wg != 'null'){
        url += '&wg=' + req.params.wg;
    }else{
        url += '&wg=';
    }
    if(req.params.wog !== undefined && req.params.wog != 'null'){
        url += '&wog=' + req.params.wog
    }else{
        url += '&wog=';

    }
    if(req.params.status !== undefined && req.params.status != 'null' ){
        url += '&status=' + req.params.status;
    }else{
        url += '&status='; 
    }
    console.log(url)
    var comics = [];
    request(url, function(error, response, html){
        if(!error){
            var $ = cheerio.load(html);

            $('.manga-box').each(function(){
            //This page has more fields to pick from. 
                var json = { 
                    title: "", 
                    link: "",
                    img: "", 
                    genre: ""
                };
                json.title = $(this).find('h3').children().text();
                json.link = $(this).find('h3').children().attr('href');
                json.img = $(this).find('img').attr('src').toString();
                //Loop through all possible genres
                json.genre = $(this).find('.genre').text().replace(/\s/g,'');

                //Add to comics array
                comics.push(json);
            });

            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(comics,null, 3));
        }
    });
});

app.listen('8080');

console.log('Magic happens on port 8080');

exports = module.exports = app;
