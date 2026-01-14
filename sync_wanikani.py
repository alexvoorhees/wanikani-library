#!/usr/bin/env python3
"""
WaniKani Library Sync
Fetches your WaniKani progress and exports known vocabulary to JSON.
"""

import os
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
API_KEY = os.getenv('WANIKANI_API_KEY')
BASE_URL = 'https://api.wanikani.com/v2'
HEADERS = {
    'Authorization': f'Bearer {API_KEY}',
    'Wanikani-Revision': '20170710'
}

# SRS stage thresholds
# WaniKani stages: 1-4=Apprentice, 5-6=Guru, 7-8=Master, 9=Enlightened, 10=Burned
KNOWN_THRESHOLD = 5  # Guru I and above


def fetch_all_pages(endpoint, params=None):
    """Fetch all pages from a paginated WaniKani API endpoint."""
    if params is None:
        params = {}

    results = []
    url = f'{BASE_URL}/{endpoint}'

    while url:
        print(f'Fetching: {url}')
        response = requests.get(url, headers=HEADERS, params=params)
        response.raise_for_status()

        data = response.json()
        results.extend(data['data'])

        # Get next page URL
        url = data['pages']['next_url']
        params = None  # Params are included in next_url

    return results


def fetch_assignments():
    """Fetch all user assignments (progress data)."""
    print('\nFetching assignments...')
    assignments = fetch_all_pages('assignments')
    print(f'Retrieved {len(assignments)} assignments')
    return assignments


def fetch_subjects():
    """Fetch all subjects (vocabulary, kanji, radicals with their data)."""
    print('\nFetching subjects...')
    subjects = fetch_all_pages('subjects', params={'types': 'vocabulary,kanji'})
    print(f'Retrieved {len(subjects)} subjects')
    return subjects


def build_subject_map(subjects):
    """Build a lookup map of subject_id -> subject data."""
    return {subject['id']: subject for subject in subjects}


def classify_vocabulary(assignments, subject_map):
    """Classify vocabulary into known/learning/unknown based on SRS stage."""
    known = []
    learning = []

    for assignment in assignments:
        subject_id = assignment['data']['subject_id']
        subject = subject_map.get(subject_id)

        # Skip if subject not found or not vocabulary
        if not subject or subject['object'] != 'vocabulary':
            continue

        srs_stage = assignment['data']['srs_stage']

        vocab_data = {
            'characters': subject['data']['characters'],
            'meanings': [m['meaning'] for m in subject['data']['meanings']],
            'readings': [r['reading'] for r in subject['data']['readings']],
            'srs_stage': srs_stage,
            'level': subject['data']['level']
        }

        if srs_stage >= KNOWN_THRESHOLD:
            known.append(vocab_data)
        elif srs_stage > 0:
            learning.append(vocab_data)

    return known, learning


def classify_kanji(assignments, subject_map):
    """Classify kanji into known/learning/unknown based on SRS stage."""
    known = []
    learning = []

    for assignment in assignments:
        subject_id = assignment['data']['subject_id']
        subject = subject_map.get(subject_id)

        # Skip if subject not found or not kanji
        if not subject or subject['object'] != 'kanji':
            continue

        srs_stage = assignment['data']['srs_stage']

        kanji_data = {
            'character': subject['data']['characters'],
            'meanings': [m['meaning'] for m in subject['data']['meanings']],
            'readings': [r['reading'] for r in subject['data']['readings']],
            'srs_stage': srs_stage,
            'level': subject['data']['level']
        }

        if srs_stage >= KNOWN_THRESHOLD:
            known.append(kanji_data)
        elif srs_stage > 0:
            learning.append(kanji_data)

    return known, learning


def export_to_json(known_vocab, learning_vocab, known_kanji, learning_kanji):
    """Export classified data to JSON files."""
    timestamp = datetime.now().isoformat()

    output_data = {
        'generated_at': timestamp,
        'classification_rule': f'Known = SRS stage {KNOWN_THRESHOLD}+ (Guru I and above)',
        'vocabulary': {
            'known': known_vocab,
            'learning': learning_vocab,
            'known_count': len(known_vocab),
            'learning_count': len(learning_vocab)
        },
        'kanji': {
            'known': known_kanji,
            'learning': learning_kanji,
            'known_count': len(known_kanji),
            'learning_count': len(learning_kanji)
        }
    }

    # Save main output file
    output_path = 'output/wanikani_library.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    # Save simplified word list (just the characters)
    simple_vocab_path = 'output/known_words_simple.txt'
    known_words = [vocab['characters'] for vocab in known_vocab]
    with open(simple_vocab_path, 'w', encoding='utf-8') as f:
        f.write(', '.join(known_words))

    print(f'\nExported to {output_path}')
    print(f'  Known vocabulary: {len(known_vocab)}')
    print(f'  Learning vocabulary: {len(learning_vocab)}')
    print(f'  Known kanji: {len(known_kanji)}')
    print(f'  Learning kanji: {len(learning_kanji)}')
    print(f'\nSimplified word list: {simple_vocab_path}')
    print(f'  {len(known_words)} words as comma-separated text')


def main():
    """Main execution function."""
    if not API_KEY or API_KEY == 'your_api_key_here':
        print('Error: Please set your WANIKANI_API_KEY in the .env file')
        return

    print('WaniKani Library Sync')
    print('=' * 50)

    try:
        # Fetch data from WaniKani
        assignments = fetch_assignments()
        subjects = fetch_subjects()

        # Build lookup map
        print('\nBuilding subject map...')
        subject_map = build_subject_map(subjects)

        # Classify vocabulary and kanji
        print('\nClassifying vocabulary...')
        known_vocab, learning_vocab = classify_vocabulary(assignments, subject_map)

        print('Classifying kanji...')
        known_kanji, learning_kanji = classify_kanji(assignments, subject_map)

        # Export results
        print('\nExporting to JSON...')
        export_to_json(known_vocab, learning_vocab, known_kanji, learning_kanji)

        print('\nSync complete!')

    except requests.exceptions.HTTPError as e:
        print(f'\nError: API request failed - {e}')
        print('Please check your API key and internet connection.')
    except Exception as e:
        print(f'\nError: {e}')


if __name__ == '__main__':
    main()
