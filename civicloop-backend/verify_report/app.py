import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

def lambda_handler(event, context):
    try:
        report_id = event['pathParameters']['id']
        body = json.loads(event['body']) if event.get('body') else {}

        table.update_item(
            Key={'id': report_id},
            UpdateExpression='SET #s = :status, claimedBy = :claimedBy',
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={
                ':status': body.get('status', 'verified'),
                ':claimedBy': body.get('claimedBy', '')
            }
        )

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Report updated'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }