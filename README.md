
 <img src="https://raw.githubusercontent.com/humanloop/memorai/master/extension/src/img/icon-192.png" width="180" alt="memorai"> 
 <img src="https://raw.githubusercontent.com/humanloop/memorai/master/extension/src/img/memorai.png" width="180" alt="memorai"> 
 
 
# Memorai

> "Memory is fundamental to our thinking, and the notion of having a perfect memory is seductive." -- Michael Nielsen
Remember everything you read.

Memorai is an AI that generates questions based on the text you're reading. It works out the perfect time to quiz you with novel AI generated questions.

# Platform
The alpha version of the Memorai platform is made up of:
 * A Chrome extension for selecting what you wish to remember
 * A machine learning question generation back end (inspired by https://github.com/KristiyanVachev/Question-Generation and using Spacy) exposed via REST API for creating novel quizes (hosted on Amazon Web Services)
 * Integration to Anki memory tool using Anki connect (leveraging the users local instance of Anki)

## Tech stack
 - Svelte with webpack for the front end
 - FastAPI, Python and spaCy for the back end


## Development

To run the server:

```
pip install -r requirements.txt
python -m spacy download en_core_web_sm
export PYTHONPATH=`PWD`:$PYTHONPATH
python app/api.py
```

To run the extension:

First, edit line 84 of extension/src/js/Popup.svelte, to replace ***replace with your URL*** with the URL where the app is running.  If running on the same machine that you intend to use the extension then you can replace with 'localhost'.  Then

```
cd extension
yarn
yarn start
```