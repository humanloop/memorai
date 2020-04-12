
 <img src="https://raw.githubusercontent.com/humanloop/memorai/master/webpack-extension/src/img/icon-192.png" width="180" alt="memorai"> 
 
# [Memorai](https://www.notion.so/humanloop/Memorai-c0df379e7f0e42598cd7fc6c5c256c7c)

> "Memory is fundamental to our thinking, and the notion of having a perfect memory is seductive." -- Michael Nielsson

Remember everything you read.

Memorai is an AI that generates questions based on the text you're reading. It works out the perfect time to quiz you with novel AI generated questions.

# Platform
The alpha version of the Memorai platform is made up of:
 * A Chrome extension for selecting what you wish to remember
 * A machine learning question generation back end exposed via REST API for creating novel quizes (hosted on Amazon Web Services)
 * Integration to Anki memory tool using Anki connect (leveraging the users local instance of Anki)

# Tech stach
 - Svelte with webpack for the front end
 - FastAPI, Python and Spacy for the back end
