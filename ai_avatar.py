import os
from openai import OpenAI

def create_custom_avatar(character_description):

    client = OpenAI(
        api_key=os.environ.get("OPENAI_API_KEY")
    )
    prompt = f"""
    Create a premium glossy 3D animated character avatar.

    Character description:
    {character_description}

    Requirements:
    - Friendly and approachable appearance
    - Polished 3D animated-film aesthetic
    - Smooth, simplified 3D forms
    - Glossy but natural skin
    - Detailed, stylized hair
    - Clearly visible face
    - Neutral, closed-mouth expression
    - From the waist up
    - Centered composition
    - Clean background
    - No classroom background
    - No text
    - No logos
    """

    response = client.images.generate(
        model="gpt-image-2",
        prompt=prompt,
        size="1024x1024"
    )

    return response.data[0].url


character_description = """
A middle-aged woman with a friendly face,
chin-length brown hair,
wearing a white shirt and a dotted blazer.
"""

print(create_custom_avatar(character_description))
