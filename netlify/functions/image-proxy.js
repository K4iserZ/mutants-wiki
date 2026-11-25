const ALLOWED_PATHS = [
  /^mobile\/hud\/fight_ui\/gene_[a-fn]\.png$/,
  /^mobile\/hud\/common_files\/icon_(?:hp|speed)\.png$/,
  /^mobile\/hud\/m_m_m\/(?:icon_[a-z0-9_]+|mutopedia\/icon_mutopedia)\.png$/,
  /^mobile\/thumbnails\/star_(?:bronze|silver|gold|platinum)\.png$/,
  /^orb\/orb_slot(?:_spe)?\.png$/,
  /^thumbnails\/[a-z0-9_]+\.png$/,
  /^gachacontent\/icon_[a-z0-9_]+\.png$/,
];

exports.handler = async event => {
  const path = event.queryStringParameters?.path || '';
  if (!ALLOWED_PATHS.some(pattern => pattern.test(path))) {
    return { statusCode: 400, body: 'Invalid image path.' };
  }

  try {
    const response = await fetch(`https://s-ak.kobojo.com/mutants/assets/${path}`);
    if (!response.ok) {
      return { statusCode: response.status, body: 'Image unavailable.' };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return { statusCode: 502, body: 'Unexpected image response.' };
    }

    const image = Buffer.from(await response.arrayBuffer());
    if (image.length > 4 * 1024 * 1024) {
      return { statusCode: 413, body: 'Image is too large.' };
    }

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
      body: image.toString('base64'),
    };
  } catch (error) {
    console.error('Image proxy request failed:', error);
    return { statusCode: 502, body: 'Unable to retrieve image.' };
  }
};
