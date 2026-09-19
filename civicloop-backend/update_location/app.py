import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

def lambda_handler(event, context):
    try:
        report_id = event['pathParameters']['id']
        body = json.loads(event['body'])

        table.update_item(
            Key={'id': report_id},
            UpdateExpression='SET lat = :lat, lng = :lng, locationUpdatedAt = :ts',
            ExpressionAttributeValues={
                ':lat': str(body['lat']),
                ':lng': str(body['lng']),
                ':ts': body.get('timestamp', '')
            }
        )

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Location updated'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }