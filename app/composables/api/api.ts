import type {PagedCollection} from "~/types/api/collection";
import type {FetchAllData, FetchItemData} from "~/types/api/api";
import type {View} from "~/types/api/view";
import type {Item} from "~/types/api/item";
import {mergician} from 'mergician';
import type {UseApiDataOptions} from "nuxt-api-party/dist/runtime/composables/useApiData";
import {useSelfUserStore} from "~/stores/useSelfUser";
import type {NuxtError} from "#app";
import type {ItemError} from "~/types/api/itemError";
import {decodeUrlUuid, formatErrorFromApiResponse} from "~/utils/resource";

export const MIME_TYPE = "application/ld+json";
export const MIME_TYPE_JSON = "application/json";
export const MIME_TYPE_JSON_PATCH = "application/merge-patch+json"
export const MIME_TYPE_CSV = "text/csv"

const CONTENT_TYPE_FORM_DATA = "multipart/form-data"

function getBasicAuthorization(isBadger: boolean = false): string {
  let bearer = useRuntimeConfig().public.clientId + ':' + useRuntimeConfig().public.clientSecret
  if (isBadger || useSelfUserStore().selfJwtToken?.isBadger) {
    bearer = useRuntimeConfig().public.badgerClientId + ':' + useRuntimeConfig().public.badgerClientSecret
  }
  return `Basic ${btoa(bearer)}`
}

async function useApi<T>(path: string, options: UseApiDataOptions<T> = {}, requireLogin: boolean = true, timeout: number = 30000): Promise<T | undefined> {
  let overloadedOptions: UseApiDataOptions<T> = {
    mode: "cors",
    cache: false,
    timeout: timeout,

    headers: {
      Accept: MIME_TYPE,
    },
  }

  if (requireLogin) {
    const selfStore = useSelfUserStore()
    const jwtToken = await selfStore.enhanceJwtTokenDefined()
    
    // enhanceJwtTokenDefined handles token refresh, expiry checks, and logout on failure
    // If we don't have a valid token at this point, the user is being redirected to login
    if (!jwtToken.value?.access?.token) {
      return undefined
    }
    
    overloadedOptions = mergician({
      headers: {
        Authorization: `Bearer ${jwtToken.value.access.token}`
      }
    }, options)

    if (selfStore.selectedProfile?.id) {
      overloadedOptions.headers.Profile = `${selfStore.selectedProfile.id}`
    }

    if (selfStore.impersonatedUser) {
      overloadedOptions.headers['X-Switch-User'] = selfStore.impersonatedUser
    }
  }

  // We keep the original body for FormData values
  if (options.body instanceof FormData) {
    overloadedOptions.body = options.body
  }

  if (!overloadedOptions?.headers?.Authorization) {
    overloadedOptions = mergician({
      headers: {
        Authorization: getBasicAuthorization()
      }
    }, options);
  }

  return await $localApi<T>(path, overloadedOptions);
}

export async function useLoginUser(email: string, password: string) {
  const { data, error } = await usePostRawJson("token", {
    grant_type: 'password',
    username: email,
    password: password
  });

  if (data) {
    const selfStore = useSelfUserStore()
    selfStore.setJwtSelfJwtTokenFromApiResponse(data)

    await selfStore.refresh()
  }

  return { error };
}

export async function useLoginBadger(clubId: string, loginToken: string) {
  const { data } = await usePostRawJson("auth/bdg", {
    token: loginToken,
    club: decodeUrlUuid(clubId)
  }, true);

  const selfStore = useSelfUserStore()
  selfStore.setJwtSelfJwtTokenFromApiResponse(data, true)

  await selfStore.refresh()

  return true;
}






export async function usePostRawJson(path: string, payload?: object, isBadger: boolean = false) {
  let data: any | undefined = undefined;
  let error: NuxtError | undefined = undefined;

  try {
    data = await $localApi(path, {
      method: "POST",
      headers: {
        Accept: MIME_TYPE_JSON,
        Authorization: getBasicAuthorization(isBadger)
      },
      body: payload
    });

  } catch (e) {
    error = formatErrorFromApiResponse(e as object) as NuxtError
  }

  return {
    data,
    error,
  };
}


export async function useFetchList<T>(resource: string): Promise<FetchAllData<T>> {
  let items: T[] = [];
  let totalItems: number | undefined = undefined;
  let view: View | undefined = undefined;
  let hubUrl: URL | undefined = undefined;
  let error: NuxtError<ItemError> | undefined = undefined;

  try {
    const data = await useApi<PagedCollection<T>>(resource);

    if (data) {
      items = data["member"];
      view = data["view"];
      totalItems = data["totalItems"];
    }
  } catch (e) {
    error = formatErrorFromApiResponse(e as object) as NuxtError<ItemError>
  }

  return {
    items,
    totalItems,
    view,
    error,
    hubUrl,
  };
}

export async function useFetchItem<T>(path: string, useCache: boolean = false, requireLogin: boolean = true): Promise<FetchItemData<T>> {
  let retrieved: T | undefined = undefined;
  let hubUrl: URL | undefined = undefined;
  let error: NuxtError<ItemError> | undefined = undefined;

  try {
    const data = await useApi<T>(path, {
      cache: useCache,
    }, requireLogin);

    retrieved = data as T;
  } catch (e) {
    error = formatErrorFromApiResponse(e as object) as NuxtError<ItemError>
  }


  return {
    retrieved,
    error,
    hubUrl,
  };
}

export async function useCreateItem<T>(resource: string, payload: Item) {
  let created: T | undefined = undefined;
  let error: NuxtError<ItemError> | undefined = undefined;

  try {
    const data = await useApi<T>(resource, {
      method: "POST",
      body: payload,
    });

    created = data as T;
  } catch (e) {
    error = formatErrorFromApiResponse(e as object) as NuxtError<ItemError>
  }

  return {
    created,
    error,
  };
}

export async function useUploadFile(resource: string, payload: FormData, requireLogin: boolean = true) {
  let created: Object | undefined = undefined;
  let error: NuxtError | undefined = undefined;

  try {
    const data = await useApi(resource, {
      method: "POST",
      timeout: null, // No timeout for file upload
      headers: {
        Accept: MIME_TYPE_JSON,
      },
      body: payload,
    }, requireLogin);

    created = data as Object;
  } catch (e) {
    error = formatErrorFromApiResponse(e as object) as NuxtError
  }

  return {
    created,
    error,
  };
}

export async function useUpdateItem<T>(item: Item, payload: Item) {
  let updated: T | undefined = undefined;
  let error: NuxtError<ItemError> | undefined = undefined;

  try {
    const data = await useApi<T>(item["@id"] ?? "", {
      method: "PUT",
      body: payload,
      headers: {
        Accept: MIME_TYPE,
        "Content-Type": MIME_TYPE,
      },
    });

    updated = data as T;
  } catch (e) {
    error = formatErrorFromApiResponse(e as object) as NuxtError<ItemError>
  }

  return {
    updated,
    error,
  };
}

export async function useGetCsv(path: string) {
  let data: string | null | undefined = null;
  let error: NuxtError | undefined = undefined;

  try {
    data = await useApi(path, {
      method: "GET",
      headers: {
        Accept: MIME_TYPE_CSV,
      },
    });
  } catch (e) {
    error = formatErrorFromApiResponse(e as object) as NuxtError
  }

  return {
    data,
    error,
  };
}

export async function usePost<T>(path: string, payload: object, requireLogin: boolean = true) {
  let item: T | undefined = undefined;
  let error: NuxtError | undefined = undefined;

  try {
    const data = await useApi<T>(path, {
      method: "POST",
      body: payload,
      headers: {
        Accept: MIME_TYPE,
        "Content-Type": MIME_TYPE,
      },
    }, requireLogin, 10000);

    item = data as T;
  } catch (e) {
    error = formatErrorFromApiResponse(e as object) as NuxtError
  }

  return {
    item,
    error,
  };
}

export async function usePut(path: string, payload: object) {
  let updated: object | undefined = undefined;
  let error: NuxtError<ItemError> | undefined = undefined;

  try {
    updated = await useApi<object>(path, {
      method: "PUT",
      body: payload,
      headers: {
        Accept: MIME_TYPE,
        "Content-Type": MIME_TYPE,
      },
    });
  } catch (e) {
    error = formatErrorFromApiResponse(e as object) as NuxtError<ItemError>
  }

  return {
    updated,
    error,
  };
}


export async function usePatch<T>(path: string, payload: object) {
  let updated: T | undefined = undefined;
  let error: NuxtError<ItemError> | undefined = undefined;

  try {
    updated = await useApi<T>(path, {
      method: "PATCH",
      body: payload,
      headers: {
        Accept: MIME_TYPE,
        "Content-Type": MIME_TYPE_JSON_PATCH,
      },
    });
  } catch (e) {
    error = formatErrorFromApiResponse(e as object) as NuxtError<ItemError>
  }

  return {
    updated,
    error,
  };
}

export async function usePatchItem<T>(item: Item, payload: Item) {
  let updated: T | undefined = undefined;
  let error: NuxtError<ItemError> | undefined = undefined;

  try {
    const data = await useApi(item["@id"] ?? "", {
      method: "PATCH",
      body: payload,
      headers: {
        Accept: MIME_TYPE,
        "Content-Type": MIME_TYPE_JSON_PATCH,
      },
    });

    updated = data as T;
  } catch (e) {
    error = formatErrorFromApiResponse(e as object) as NuxtError<ItemError>
  }

  return {
    updated,
    error,
  };
}

export async function useDeleteItem(item?: Item | null) {
  let error: NuxtError<ItemError> | undefined = undefined;

  if (!item || !item["@id"]) {
    error = new Error("No item found. Please reload");
    return {
      error,
    };
  }

  try {
    const data = await useApi(item["@id"] ?? "", {
      method: "DELETE",
    });
  } catch (e) {
    error = formatErrorFromApiResponse(e as object) as NuxtError<ItemError>
  }

  return {
    error,
  };
}

export async function useDelete(path: string, payload?: object) {
  let error: Error | undefined = undefined;

  try {
    await useApi(path, {
      method: "DELETE",
      body: payload,
      headers: {
        Accept: MIME_TYPE,
        "Content-Type": MIME_TYPE_JSON,
      },
    });
  } catch (e) {
    error = formatErrorFromApiResponse(e as object) as Error
  }

  return {
    error,
  };
}

