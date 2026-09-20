import json
import boto3
from botocore.config import Config

# Fast config so AWS Bedrock throttling exceptions fail fast instead of hanging
bedrock_config = Config(
    retries={'max_attempts': 1, 'mode': 'standard'},
    connect_timeout=3,
    read_timeout=10
)

bedrock = boto3.client("bedrock-runtime", region_name="ap-south-1", config=bedrock_config)

# Nova Micro in ap-south-1 requires the APAC inference profile ID or foundation model
MODEL_IDS = [
    "apac.amazon.nova-micro-v1:0",
    "amazon.nova-micro-v1:0"
]

SYSTEM_PROMPT = (
    "You are a helpful assistant for Nourish, a food donation app connecting "
    "restaurants/donors with NGOs. Answer questions about how to donate food, "
    "how to claim a donation, and how the app works. Keep answers short and friendly."
)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}

def get_fallback_reply(user_message: str) -> str:
    """Intelligent fallback for Nourish app questions if Bedrock is throttled or offline."""
    msg = user_message.lower()
    
    if any(k in msg for k in ['donate', 'give', 'share', 'surplus', 'food', 'log']):
        return (
            "To donate surplus food, click the orange **'Donate now'** button at the top or 'Log surplus food' on the home page. "
            "You can specify the food item name, quantity (e.g. 15 kg or 20 servings), and pickup location. You can even click 'Speak your donation' to use voice input!"
        )
    elif any(k in msg for k in ['claim', 'ngo', 'pick up', 'pickup', 'collect', 'volunteer']):
        return (
            "NGOs and volunteers can browse available donations under **'Food that's ready'**. "
            "Click the **'Claim'** button on any pending listing, enter your NGO name, and you'll receive a live tracking link to share with the pickup volunteer."
        )
    elif any(k in msg for k in ['track', 'status', 'location', 'map', 'where']):
        return (
            "You can track claimed food donations live! Click the **'Track →'** button next to any claimed report "
            "to view real-time status and location updates powered by AWS."
        )
    elif any(k in msg for k in ['how', 'work', 'about', 'nourish', 'what', 'app']):
        return (
            "Nourish is a community food surplus network connecting donors with NGOs to turn extra food into real meals. "
            "It runs on AWS Lambda, API Gateway & DynamoDB for live real-time tracking."
        )
    else:
        return (
            "Hello! I am the Nourish Assistant. You can ask me how to log surplus food donations, how NGOs can claim available food, or how to track live pickups."
        )


def lambda_handler(event, context):
    # Handle CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
        user_message = body.get("message", "").strip()
        history = body.get("history", [])

        if not user_message:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": "message is required"}),
            }

        reply = None

        # Build messages for Bedrock Converse API
        messages = []
        for entry in history[-10:]:
            role = entry.get("role", "user")
            content = entry.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": [{"text": content}]})

        messages.append({"role": "user", "content": [{"text": user_message}]})

        # Try calling Bedrock with inference profile IDs
        for model_id in MODEL_IDS:
            try:
                response = bedrock.converse(
                    modelId=model_id,
                    system=[{"text": SYSTEM_PROMPT}],
                    messages=messages,
                    inferenceConfig={
                        "maxTokens": 512,
                        "temperature": 0.7,
                        "topP": 0.9,
                    },
                )
                output_message = response.get("output", {}).get("message", {})
                blocks = output_message.get("content", [])
                text_parts = [b["text"] for b in blocks if "text" in b]
                if text_parts:
                    reply = "".join(text_parts)
                    print(f"Successfully invoked Bedrock model {model_id}")
                    break
            except Exception as e:
                print(f"Bedrock converse failed for model {model_id}: {type(e).__name__} - {e}")

        # If Bedrock call failed or was throttled, use friendly fallback reply
        if not reply:
            print("Using fallback Nourish AI response")
            reply = get_fallback_reply(user_message)

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"reply": reply}),
        }

    except Exception as e:
        print(f"Unhandled Lambda exception: {e}")
        fallback = get_fallback_reply("")
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"reply": fallback}),
        }
