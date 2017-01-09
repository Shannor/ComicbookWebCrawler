const express = require('express');
const fs      = require('fs');
const request = require('request');
const cheerio = require('cheerio');
const app     = express();
const async   = require('async');

const baseURL = "http://www.readcomics.tv/";

//Get request to get all comics on the website in Alpha/ Numberic order
app.get('/scrape-all', function(req, res){
  //URL to hit for all the comics 
  var url = "http://comicastle.org/manga-list.html?listType=allABC";
  
  request(url, function(error, response, html){
        // First we'll check to make sure no errors occurred when making the request
        if(!error){
            // Var to hold all the comic information 
            var comics = { Number:[] , A: [], B:[] , C:[], D:[], E:[], F:[], G:[], H:[], I:[], J:[], K:[], L:[],
            M:[], N:[], O:[], P:[], Q:[], R:[], S:[], T:[], U:[], V:[], W:[], X:[], Y:[], Z:[] };
            // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality
            var $ = cheerio.load(html);

            $('span').each(function(i, elm){
                //Only get manga enteries  
                if( $(this).attr('data-toggle') == 'mangapop'){
                  //Only has the title and link present here 
                  var json = { title: "", link: ""};
                  
                  json.title = $(this).attr('data-original-title').toString();
                  json.link = $(this).children().children().attr('href').toString();
                  var category = $(this).siblings('h3').text();
                  //Add comic to correct category
                  if(category == "#"){
                      comics.Number.push(json);
                  }else{
                      comics[category].push(json);
                  }
                }
            });
        }
        //Return the Array of all the JSON comic objects
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(comics,null, 3));
    });
});

//GET method to receive comics by popluarity or other features
app.get('/scrape-pages', function(req, res){
    //Url to hit
    var url = "http://comicastle.org/manga-list.html?listType=pagination&page=1&artist=&author=&name=&genre=&sort=views&sort_type=DESC";
  request(url, function(error, response, html){
        // First we'll check to make sure no errors occurred when making the request
        if(!error){
            // Var to hold all the comic information 
            var comics = [];
            // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality
            var $ = cheerio.load(html);

            $('span').each(function(){
                //Only get manga entries 
                if( $(this).attr('data-toggle') == 'mangapop'){
                  //This page has more fields to pick from. 
                  var json = { 
                      title: "", 
                      link: "",
                      img: "", 
                      genre: [] , 
                      totalViews: 0, 
                      lastIssueLink: "", 
                      lastIssueNum:0 
                    };

                  json.title = $(this).attr('data-original-title').toString();
                  json.link = $(this).children('.media').children().attr('href').toString();
                  json.img = $(this).find('img').attr('src').toString();
                  //Loop through all possible genres
                  $(this).find('small').each(function(){
                    json.genre.push($(this).text());
                  });

                  json.totalViews = $(this).children('.media').find('span').text();
                  json.lastIssueLink = $(this).find('small').siblings('a').attr('href');
                  json.lastIssueNum = $(this).find('small').siblings('a').text();
                  //Add to comics array
                  comics.push(json);
                }
            });

        }
        //Return the Created JSON Dictionary. 
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(comics,null, 3));

    });

});

//GET method to return the list of all Issue of a Comic 
app.get('/listIssues/:comicUrl', function(req, res){

    var url = baseURL + req.params.comicUrl;

    request(url, function(error, response, html){
        // First we'll check to make sure no errors occurred when making the request
        if(!error){
            var listOfComics = [];

            var $ = cheerio.load(html);

            $('tr').each(function(){

                var json = {
                    chapterName: "", 
                    link: ""
                };

                var link = $(this).find('a').attr('href');
                //Null check and make sure its a link to reading 
                if( link != null && link.indexOf("read") >= 0){
                    json.link = link;
                    json.chapterName = $(this).find('a').text();
                    listOfComics.push(json);
                }
            });
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(listOfComics,null, 3));
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