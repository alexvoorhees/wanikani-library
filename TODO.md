# TODO - Future Improvements

## Next: Web Interface

Build a simple web app to generate Japanese stories using your known vocabulary.

### Architecture
- **Frontend**: Simple HTML/JS interface with text input and display
- **Backend**: Flask (Python) API endpoint
- **API Integration**: Call Claude/OpenAI API with vocabulary constraint
- **Local first**: Test on localhost before deploying

### Steps
1. Choose stack (Flask recommended)
2. Build basic API endpoint that takes topic and generates story
3. Create simple frontend HTML form
4. Connect frontend to backend API
5. Test locally
6. Deploy (optional - Vercel/Railway/Render)

### Estimated Time
- 2-3 hours for working local version
- +1 hour for deployment

## Other Ideas

- **Frequency filtering**: Create "top 500 most common words" subset for stricter constraints
- **Validation script**: Check if generated text uses only known words
- **Grammar level tracking**: Add JLPT grammar patterns you know
- **Auto-sync**: Schedule weekly sync as you learn new words
- **Custom GPT prompt optimization**: Fine-tune instructions for better adherence

## Notes

The simplified word list (`known_words_simple.txt`) works better with Custom GPTs than the full JSON for maintaining vocabulary constraints.
