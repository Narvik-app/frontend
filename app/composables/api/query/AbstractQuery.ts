import {useCreateItem, useDeleteItem, useFetchItem, useFetchList, useGetCsv, usePatchItem} from "~/composables/api/api";
import type {FetchAllData, FetchItemData} from "~/types/api/api";
import type {Item} from "~/types/api/item";
import {useSelfUserStore} from "~/stores/useSelfUser";
import type {NuxtError} from "#app";

export abstract class AbstractQuery<R, W> {
	protected abstract rootPath: string;
	public clubPath: string | undefined = undefined;

  protected getRootUrl(): string {
    return this.rootPath;
  }

  protected getCurrentClubPath(): string {
    const selfStore = useSelfUserStore()

    if (selfStore.isSuperAdmin()) {
      if (this.clubPath) {
        return this.clubPath;
      }
    }

    const profile = selfStore.selectedProfile
    if (profile === undefined || !profile.club["@id"]) {
      throw new Error("No profile selected")
    }
    return profile.club["@id"]
  }

	async get(id: string, useCache: boolean = false, requireLogin: boolean = true): Promise<FetchItemData<R>> {
		return useFetchItem<R>(this.getRootUrl() + "/" + id, useCache, requireLogin);
	}

	async getAll(urlParams?: URLSearchParams): Promise<FetchAllData<R>> {
		let url = this.getRootUrl();
		if (urlParams) {
			url += '?' + urlParams.toString()
		}
		return useFetchList<R>(url);
	}

  async getAllCsv(urlParams?: URLSearchParams, itemsPerPage = 100) {
    let url = `${this.getRootUrl()}.csv`;

    if (!urlParams) {
      urlParams = new URLSearchParams()
    }

    url += '?' + urlParams.toString()
    if (urlParams.has('pagination')) {
      return useGetCsv(url)
    }

    const data = '';
    const error: NuxtError | undefined = undefined;
    const response = {
      data,
      error
    }

    // No disabled pagination, we are guessing the number of pages to request
    urlParams.set('page', '1')
    urlParams.set('itemsPerPage', '1') // We just want the total items so we can do the pagination
    const { totalItems, view } = await this.getAll(urlParams)
    if (!totalItems) {
      return response
    }

    urlParams.set('itemsPerPage', itemsPerPage.toString())

    const numberOfPages = Math.ceil(totalItems / itemsPerPage)
    for (let i = 0; i < numberOfPages; i++) {
      urlParams.set('page', (i+1).toString())
      urlParams.set('pagination', '1') // We set the pagination so the recursive call won't execute again this code
      let { data } = await this.getAllCsv(urlParams, itemsPerPage)
      if (data) {
        // We remove the header if already set
        if (response.data.length > 0) {
          data = data.substring(data.indexOf("\n") + 1)
        }
        response.data += data
      }
    }
    return response
  }

  async getAllWithoutPagination(urlParams?: URLSearchParams, itemsPerPage = 100) {
    if (!urlParams) {
      urlParams = new URLSearchParams()
    }

    // Figure out the number of pages to request
    urlParams.set('page', '1')
    urlParams.set('itemsPerPage', '1')
    const { totalItems } = await this.getAll(urlParams)
    if (!totalItems) {
      return
    }

    urlParams.set('itemsPerPage', itemsPerPage.toString())

    const numberOfPages = Math.ceil(totalItems / itemsPerPage)
    const data = []
    const maxRetries = 3

    for (let i = 0; i < numberOfPages; i++) {
      urlParams.set('page', (i+1).toString())
      let fetched = false
      let attempt = 1

      while (!fetched) {
        const { items } = await this.getAll(urlParams)
        if (items) {
          data.push(...items)
          fetched = true
        } else {
          // Do 3 attempts in case of failure
          if (attempt >= maxRetries) {
            return
          }
          attempt += 1

          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
    }

    return data
  }

	async post(payload: Item) {
		return useCreateItem<R>(this.getRootUrl(), payload)
	}

	async patch(item: Item, payload: Item) {
		return usePatchItem<R>(item, payload)
	}

	async delete(item?: Item | null) {
		return useDeleteItem(item)
	}
}
