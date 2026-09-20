import json
import boto3

bedrock = boto3.client("bedrock-runtime", region_name="ap-south-1")

MODEL_ID = "amazon.nova-micro-v1:0"

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

        # Build the messages list from conversation history
        messages = []
        for entry in history[-20:]:  # Keep last 20 turns to stay within limits
            role = entry.get("role", "user")
            content = entry.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": [{"text": content}]})

        # Append the current user message
        messages.append({"role": "user", "content": [{"text": user_message}]})

        # Call Bedrock with the Converse API
        response = bedrock.converse(
            modelId=MODEL_ID,
            system=[{"text": SYSTEM_PROMPT}],
            messages=messages,
            inferenceConfig={
                "maxTokens": 512,
                "temperature": 0.7,
                "topP": 0.9,
            },
        )

        # Extract the assistant reply
        reply = ""
        output_message = response.get("output", {}).get("message", {})
        for block in output_message.get("content", []):
            if "text" in block:
                reply += block["text"]

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"reply": reply}),
        }

    except Exception as e:
        print(f"Error: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": str(e)}),
        }
