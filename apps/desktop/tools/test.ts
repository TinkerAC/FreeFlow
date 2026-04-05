


//test innertube provider



import 'reflect-metadata';

import { Innertube } from 'youtubei.js';


const client:Promise<Innertube> = Innertube.create()


client.then((innertube)=>{
    innertube.search('').then((searchResults)=>{
        console.log('Search Results for "Shape of You":');
        searchResults.results.forEach((item, index)=>{
            console.log(`${index + 1}. ${JSON.stringify(item, null, 2)}`);
        });
    }).catch((error)=>{
        console.error('Error during search:', error);
    });
}).catch((error)=>{
    console.error('Error creating Innertube client:', error);
});