import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Card, Table, Select, Button, Space, Modal, Tag, message, Pagination } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { shopApi, exportApi } from '../services/api'
import { setShops, setDistricts, setLoading } from '../store/appSlice'
import { RootState } from '../store'

const { Option } = Select

interface Shop {
  id: number
  platform: string
  shop_name: string
  address?: string
  rating?: number
  sales?: number
  district: string
  created_at: string
}

const DataView: React.FC = () => {
  const dispatch = useDispatch()
  const { shops, districts } = useSelector((state: RootState) => state.app)
  const [platform, setPlatform] = useState<string>('')
  const [district, setDistrict] = useState<string>('')
  const [packagesModal, setPackagesModal] = useState<{ visible: boolean; shopId: number }>({ visible: false, shopId: 0 })
  const [reviewsModal, setReviewsModal] = useState<{ visible: boolean; shopId: number }>({ visible: false, shopId: 0 })
  const [packages, setPackages] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setPageLoading] = useState(false)

  const loadShops = async (p = 1) => {
    try {
      setPageLoading(true)
      const res = await shopApi.list({ platform, district, page: p, limit: 20 })
      if (res.data.success) {
        dispatch(setShops(res.data.shops))
        setTotal(res.data.total)
        setPage(p)
      }
    } catch (error) {
      message.error('加载数据失败')
    } finally {
      setPageLoading(false)
    }
  }

  const loadDistricts = async () => {
    try {
      const res = await shopApi.getDistricts()
      if (res.data.success) {
        dispatch(setDistricts(res.data.districts))
      }
    } catch (error) {
      console.error('加载商圈失败')
    }
  }

  useEffect(() => {
    loadShops()
    loadDistricts()
  }, [])

  useEffect(() => {
    loadShops(1)
  }, [platform, district])

  const showPackages = async (shopId: number) => {
    try {
      const res = await shopApi.getPackages(shopId)
      if (res.data.success) {
        setPackages(res.data.packages)
        setPackagesModal({ visible: true, shopId })
      }
    } catch (error) {
      message.error('加载套餐失败')
    }
  }

  const showReviews = async (shopId: number) => {
    try {
      const res = await shopApi.getReviews(shopId)
      if (res.data.success) {
        setReviews(res.data.reviews)
        setReviewsModal({ visible: true, shopId })
      }
    } catch (error) {
      message.error('加载评价失败')
    }
  }

  const getPlatformTag = (platform: string) => {
    const color = platform === 'douyin' ? 'blue' : 'orange'
    const text = platform === 'douyin' ? '抖音' : '美团'
    return <Tag color={color}>{text}</Tag>
  }

  const columns = [
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: getPlatformTag
    },
    {
      title: '店铺名称',
      dataIndex: 'shop_name',
      key: 'shop_name'
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address'
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 100
    },
    {
      title: '销量',
      dataIndex: 'sales',
      key: 'sales',
      width: 100
    },
    {
      title: '商圈',
      dataIndex: 'district',
      key: 'district',
      width: 150
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: Shop) => (
        <Space>
          <Button type="link" size="small" onClick={() => showPackages(record.id)}>套餐</Button>
          <Button type="link" size="small" onClick={() => showReviews(record.id)}>评价</Button>
        </Space>
      )
    }
  ]

  const packageColumns = [
    { title: '套餐名称', dataIndex: 'package_name', key: 'package_name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '价格', dataIndex: 'price', key: 'price' },
    { title: '原价', dataIndex: 'original_price', key: 'original_price' },
    { title: '销量', dataIndex: 'sales', key: 'sales' }
  ]

  const reviewColumns = [
    { title: '用户名', dataIndex: 'user_name', key: 'user_name' },
    { title: '评分', dataIndex: 'rating', key: 'rating' },
    { title: '内容', dataIndex: 'content', key: 'content' },
    { title: '评价时间', dataIndex: 'review_time', key: 'review_time' }
  ]

  return (
    <div>
      <Card 
        title="数据查看" 
        extra={
          <Space>
            <Select 
              placeholder="选择平台" 
              style={{ width: 120 }} 
              allowClear 
              value={platform || undefined} 
              onChange={setPlatform}
            >
              <Option value="douyin">抖音</Option>
              <Option value="meituan">美团</Option>
            </Select>
            <Select 
              placeholder="选择商圈" 
              style={{ width: 150 }} 
              allowClear 
              value={district || undefined} 
              onChange={setDistrict}
            >
              {districts.map(d => (
                <Option key={d} value={d}>{d}</Option>
              ))}
            </Select>
            <Button icon={<DownloadOutlined />} onClick={() => exportApi.toExcel({ platform, district })}>导出Excel</Button>
            <Button icon={<DownloadOutlined />} onClick={() => exportApi.toCSV({ platform, district })}>导出CSV</Button>
            <Button icon={<DownloadOutlined />} onClick={() => exportApi.toJSON({ platform, district })}>导出JSON</Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={shops}
          rowKey="id"
          pagination={false}
          loading={loading}
        />
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Pagination
            current={page}
            total={total}
            pageSize={20}
            onChange={loadShops}
          />
        </div>
      </Card>

      <Modal
        title="套餐信息"
        open={packagesModal.visible}
        onCancel={() => setPackagesModal({ visible: false, shopId: 0 })}
        footer={null}
        width={800}
      >
        <Table columns={packageColumns} dataSource={packages} rowKey="id" pagination={false} />
      </Modal>

      <Modal
        title="用户评价"
        open={reviewsModal.visible}
        onCancel={() => setReviewsModal({ visible: false, shopId: 0 })}
        footer={null}
        width={800}
      >
        <Table columns={reviewColumns} dataSource={reviews} rowKey="id" pagination={false} />
      </Modal>
    </div>
  )
}

export default DataView
