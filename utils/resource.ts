import UuidEncoder from "uuid-encoder";

export const getIdFromIri = (iri?: string): string => {
  if (!iri) return "";

  const id = iri.split("/").pop();

  if (!id) {
    return "";
  }

  return id;
};

export function convertUuidToUrlUuid(uuid?: string): string {
  if (!uuid) {
    return ''
  }
  const encoder = new UuidEncoder('base62')
  return encoder.encode(uuid)
}

export function decodeUrlUuid(uuid?: string): string {
  if (!uuid) {
    return ''
  }
  const encoder = new UuidEncoder('base62')
  return encoder.decode(uuid)
}

export function pathsMatch(paths: string[], path: string): boolean {
  let pathMatched = false;
  paths.forEach(allowedPath => {
    const result = path.match(new RegExp(allowedPath));
    if (result) {
      pathMatched = true;
      return;
    }
  });
  return pathMatched;
}

export function formatErrorFromApiResponse(response: any): object {
  if (typeof response === 'string') {
    return {
      message: response
    }
  }

  if (!('data' in response)) {
    return response
  }

  // We try setting the message based on the api error response
  if ('description' in response.data) {
    response.message = response.data.description
    return response
  }

  if ('detail' in response.data) {
    response.message = response.data.detail
    return response
  }

  return response
}
