# UGM Tech Scraper


UGM Tech Scraper is an API that provides tools and data from websites of departments or majors in UGM that related to technology such as DTEDI, DTETI, and DIKE.

## Features

- DTEDI, DIKE, dan DTETI 's lecturers data
- Software Engineering, IT, and CompSci major  's courses data.
- Simaster's PDF Class Schedule to JSON data converter

## How it works
#### Data Scraping
- Set scraping schedule interval (Example : every 3 days) .
- When the API is called, check if (Today Date) - (Last Scraping Date) is the same as the scraping schedule interval.
- If it's the same, scrape data from the website and insert it to database, then update last scraping date to today.
- If it's not, return data from database which is the data that scraped from the website in the last scraping schedule.
#### Convert Simaster's PDF Class Schedule to JSON
- Receive the PDF that user uploaded.
- Extract the PDF's text data.
- Extract University Name (UGM), Faculty, Semester, and the Class Schedule data from the text. 
- Insert the data to object and return it as JSON

- ## Endpoints
`/api/dosen` **[GET]** <br>
return all of DTEDI, DTETI, and DIKE lecturers data. <br> <br>
`/api/dosen/dtedi` **[GET]** <br>
return all of DTEDI lecturers data. <br> <br>
`/api/dosen/dteti` **[GET]** <br>
return all of DTETI lecturers data. <br> <br>
`/api/dosen/dike` **[GET]** <br>
return all of DIKE lecturers data. <br> <br>
`/api/matkul` **[GET]** <br>
return all of Software Engineering, IT, and CompSci major's courses data. <br> <br>
`/api/matkul/dtedi` **[GET]** <br>
return all of Software Engineering major's courses data. <br> <br>
`/api/matkul/dteti` **[GET]** <br>
return all of IT major's courses data. <br> <br>
`/api/matkul/dike` **[GET]** <br>
return all of CompSci major's courses data. <br> <br>
`/api/jadwalsimaster` **[POST]** <br>
accept simaster's pdf class schedule and return it as JSON data. <br> <br>
`/testapijadwalsimaster` **[GET]** <br>
page to test the `/api/jadwalsimaster` endpoint. Upload file to the endpoint and display the response. <br>

## Setup and Installation

 <br>

```sh
Start your mysql server and run the query in database.sql
```
Install required packages
```sh
npm install
```
Run it
```sh
npm start
```
