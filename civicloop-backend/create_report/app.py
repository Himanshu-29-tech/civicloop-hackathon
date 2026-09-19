import json
import boto3
import uuid
from datetime import datetime
import os

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])

        report_id = str(uuid.uuid4())
        item = {
            'id': report_id,
            'type': body.get('type', 'donor'),  # donor / ngo / citizen
            'itemName': body.get('itemName', ''),
            'quantity': body.get('quantity', ''),
            'location': body.get('location', ''),
            'status': 'pending',
            'claimedBy': '',
            'createdAt': datetime.utcnow().isoformat()
        }

        table.put_item(Item=item)

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Report created', 'report': item})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }