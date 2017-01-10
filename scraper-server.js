const express = require('express');
const fs      = require('fs');
const request = require('request');
const cheerio = require('cheerio');
const app     = express();
const async   = require('async');

const baseURL = "http://www.readcomics.tv/";


//TODO: Need an newly updated get request for homepage
//Get request to get all comics on the website in Alpha/ Numberic order
app.get('/comic-list-AZ', function(req, res){
  //URL to hit for all the comics A-Z
  var url = baseURL + "comic-list";
  
  request(url, function(error, response, html){
        // First we'll check to make sure no errors occurred when making the request
        if(!error){
            // Var to hold all the comic information 
            var comics = { Number:[] , A: [], B:[] , C:[], D:[], E:[], F:[], G:[], H:[], I:[], J:[], K:[], L:[],
            M:[], N:[], O:[], P:[], Q:[], R:[], S:[], T:[], U:[], V:[], W:[], X:[], Y:[], Z:[] };
            // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality
            var $ = cheerio.load(html);

            $('.container').find('li').each(function(){
                  //Only has the title and link present here 
                  var json = { title: "", link: ""};
                  json.title = $(this).children().text();
                  json.link = $(this).children().attr('href').toString();
                  var category = $(this).parent().siblings('div').text();
                  //Add comic to correct category
                  if(category == "#" || !isNaN(category)){
                      comics.Number.push(json);
                  }else{
                      comics[category].push(json);
                  }
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
app.get('/listIssues/:comicName', function(req, res){

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
app.get('/readComic/:comicUrl', function(req, res){
    //Get length of select object to count the number of pages
    var wholeReadUrl = req.params.comicUrl;
    //Removes the .html off it 
    var baseReadUrl = "http://www.readcomics.tv/the-walking-dead/chapter-2";
    var url = "http://www.readcomics.tv/the-walking-dead/chapter-2";
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
                pageURLs.push(baseReadUrl + "/"+ i);
            }

            async.map(pageURLs, getComicImage, function (err, data){
                if (err) return console.log(err);
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(data,null, 3));
            });

 
        }
    });

});

//Iterator function for the async map method
function getComicImage(url, callback) {
    request(url, function(err, res, html) {
        if(!err){
            var $ = cheerio.load(html);
            var imageUrl = $('#main_img').attr('src');
            callback(err, imageUrl);
        }
    });
}

app.listen('8081');

console.log('Magic happens on port 8081');

exports = module.exports = app;