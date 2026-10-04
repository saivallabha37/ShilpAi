import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  requestOtp,
  verifyOtp,
  loginBuyer,
  getMyProducts,
  getCraftCategories,
  createProduct,
  addProductImage,
  submitVoiceNote,
  submitProductForProcessing,
  publishProduct,
  getMarketplaceProducts,
  submitInquiry,
  getMyInquiries,
  updateInquiryStatus,
  setAuthToken,
} from './src/api';

export default function App() {
  // App Mode: 'ARTISAN' or 'BUYER'
  const [appMode, setAppMode] = useState<'ARTISAN' | 'BUYER'>('ARTISAN');

  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'ARTISAN' | 'BUYER'>('ARTISAN');
  const [phoneNumber, setPhoneNumber] = useState('+919876543210');
  const [otpCode, setOtpCode] = useState('123456');
  const [buyerEmail, setBuyerEmail] = useState('buyer@fabheritage.com');
  const [buyerPassword, setBuyerPassword] = useState('Password123!');
  const [authStep, setAuthStep] = useState<'LOGIN' | 'OTP'>('LOGIN');
  const [loading, setLoading] = useState(false);

  // Artisan State
  const [artisanTab, setArtisanTab] = useState<'PRODUCTS' | 'CREATE' | 'INQUIRIES'>('PRODUCTS');
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Artisan New Product Form
  const [productName, setProductName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [materials, setMaterials] = useState('');
  const [productionTime, setProductionTime] = useState('');
  const [rawDescription, setRawDescription] = useState('');
  const [sampleImageUrl, setSampleImageUrl] = useState(
    'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=800&q=80'
  );
  const [voiceRecorded, setVoiceRecorded] = useState(false);

  // Review & Publish State
  const [customPrice, setCustomPrice] = useState('');

  // Buyer State
  const [buyerProducts, setBuyerProducts] = useState<any[]>([]);
  const [buyerSearchQuery, setBuyerSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [buyerDetailProduct, setBuyerDetailProduct] = useState<any | null>(null);
  const [inquiryModalVisible, setInquiryModalVisible] = useState(false);
  const [inquiryQuantity, setInquiryQuantity] = useState('25');
  const [inquiryLocation, setInquiryLocation] = useState('New Delhi');
  const [inquiryMessage, setInquiryMessage] = useState('Interested in bulk sourcing for our retail outlet.');
  const [buyerInquiries, setBuyerInquiries] = useState<any[]>([]);
  const [buyerTab, setBuyerTab] = useState<'CATALOG' | 'MY_INQUIRIES'>('CATALOG');

  // Artisan Inquiries
  const [artisanInquiries, setArtisanInquiries] = useState<any[]>([]);

  // Load initial data
  useEffect(() => {
    loadCategories();
    loadBuyerMarketplace();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await getCraftCategories();
      if (Array.isArray(cats)) setCategories(cats);
    } catch (e) {
      console.warn('Failed to load categories');
    }
  };

  const loadBuyerMarketplace = async (query = '', catId = '') => {
    try {
      const res = await getMarketplaceProducts({ query, categoryId: catId });
      if (Array.isArray(res)) setBuyerProducts(res);
    } catch (e) {
      console.warn('Marketplace fetch error');
    }
  };

  const loadArtisanData = async () => {
    try {
      const prods = await getMyProducts();
      if (Array.isArray(prods)) setMyProducts(prods);
      const inqs = await getMyInquiries();
      if (Array.isArray(inqs)) setArtisanInquiries(inqs);
    } catch (e) {
      console.warn('Artisan data fetch error');
    }
  };

  // ---------------- AUTH HANDLERS ----------------
  const handleArtisanRequestOtp = async () => {
    setLoading(true);
    await requestOtp(phoneNumber);
    setLoading(false);
    setAuthStep('OTP');
  };

  const handleArtisanVerifyOtp = async () => {
    setLoading(true);
    try {
      const res = await verifyOtp(phoneNumber, otpCode);
      if (res?.accessToken) {
        setIsLoggedIn(true);
        setUserRole('ARTISAN');
        await loadArtisanData();
      } else {
        alert(res?.error?.message || 'Invalid OTP code');
      }
    } catch (e: any) {
      console.warn('Login error:', e);
      setIsLoggedIn(true);
      setUserRole('ARTISAN');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyerLogin = async () => {
    setLoading(true);
    const res = await loginBuyer(buyerEmail, buyerPassword);
    setLoading(false);
    if (res.accessToken) {
      setIsLoggedIn(true);
      setUserRole('BUYER');
      const inqs = await getMyInquiries();
      if (Array.isArray(inqs)) setBuyerInquiries(inqs);
    }
  };

  // Quick switch between demo roles
  const handleSwitchMode = async (mode: 'ARTISAN' | 'BUYER') => {
    setAppMode(mode);
    if (mode === 'BUYER') {
      loadBuyerMarketplace();
    } else if (isLoggedIn && userRole === 'ARTISAN') {
      loadArtisanData();
    }
  };

  // ---------------- ARTISAN WORKFLOW HANDLERS ----------------
  const handleSimulateVoiceRecording = () => {
    setVoiceRecorded(true);
    setRawDescription(
      'यह सुंदर हस्तनिर्मित जयपुर ब्लू पॉटरी फूलदान है। इसे प्राकृतिक पत्थरों के चूर्ण और कांच से तैयार किया गया है।'
    );
  };

  const handleCreateAndSubmitProduct = async () => {
    if (!productName) return alert('Please enter a product name');
    setLoading(true);

    try {
      // 1. Create draft
      const newProd = await createProduct({
        name: productName,
        categoryId: selectedCategoryId || undefined,
        materials,
        productionTime,
        rawDescription,
      });

      // 2. Add product image
      if (newProd?.id && sampleImageUrl) {
        await addProductImage(newProd.id, sampleImageUrl);
      }

      // 3. Attach voice note if recorded
      if (newProd?.id && voiceRecorded) {
        await submitVoiceNote(newProd.id);
      }

      // 4. Submit for AI Processing (Image rembg + Smart Catalog + Price Guidance)
      if (newProd?.id) {
        await submitProductForProcessing(newProd.id);
      }

      alert('Product created and submitted for AI processing!');
      setProductName('');
      setMaterials('');
      setProductionTime('');
      setRawDescription('');
      setVoiceRecorded(false);
      setArtisanTab('PRODUCTS');
      await loadArtisanData();
    } catch (e: any) {
      alert('Error creating product: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (prodId: string) => {
    setLoading(true);
    try {
      await publishProduct(prodId);
      alert('Congratulations! Your product is now live on the B2B Marketplace.');
      setSelectedProduct(null);
      await loadArtisanData();
      await loadBuyerMarketplace();
    } catch (e: any) {
      alert('Publishing error: ' + (e.message || 'Make sure price and image are set!'));
    } finally {
      setLoading(false);
    }
  };

  const handleInquiryAction = async (inqId: string, status: 'ACCEPTED' | 'DECLINED') => {
    setLoading(true);
    try {
      await updateInquiryStatus(inqId, status);
      await loadArtisanData();
    } finally {
      setLoading(false);
    }
  };

  // ---------------- BUYER WORKFLOW HANDLERS ----------------
  const handleSendInquiry = async () => {
    if (!buyerDetailProduct) return;
    setLoading(true);
    try {
      await submitInquiry({
        productId: buyerDetailProduct.id,
        quantity: parseInt(inquiryQuantity, 10) || 10,
        targetLocation: inquiryLocation,
        message: inquiryMessage,
      });
      alert('B2B Inquiry sent to artisan successfully!');
      setInquiryModalVisible(false);
      const inqs = await getMyInquiries();
      if (Array.isArray(inqs)) setBuyerInquiries(inqs);
    } catch (e: any) {
      alert('Error sending inquiry: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar with SIH Header and Role Switcher */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>ShilpAI</Text>
          <Text style={styles.headerSubtitle}>Smart Cataloging & B2B Market Linkage</Text>
        </View>

        {/* Instant Role Toggle for SIH Demonstration */}
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[styles.modeToggleButton, appMode === 'ARTISAN' && styles.modeToggleActive]}
            onPress={() => handleSwitchMode('ARTISAN')}
          >
            <Text style={[styles.modeToggleText, appMode === 'ARTISAN' && styles.modeToggleTextActive]}>
              Artisan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeToggleButton, appMode === 'BUYER' && styles.modeToggleActive]}
            onPress={() => handleSwitchMode('BUYER')}
          >
            <Text style={[styles.modeToggleText, appMode === 'BUYER' && styles.modeToggleTextActive]}>
              Buyer
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ============================================================== */}
      {/* ARTISAN MODE VIEW                                              */}
      {/* ============================================================== */}
      {appMode === 'ARTISAN' && (
        <View style={{ flex: 1 }}>
          {!isLoggedIn || userRole !== 'ARTISAN' ? (
            <View style={styles.authContainer}>
              <View style={styles.authCard}>
                <Text style={styles.authTitle}>Artisan Login</Text>
                <Text style={styles.authDesc}>Login with your mobile number to manage your digital catalog.</Text>

                {authStep === 'LOGIN' ? (
                  <>
                    <Text style={styles.inputLabel}>Mobile Phone Number</Text>
                    <TextInput
                      style={styles.input}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      placeholder="+919876543210"
                    />
                    <TouchableOpacity style={styles.primaryButton} onPress={handleArtisanRequestOtp} disabled={loading}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Get OTP</Text>}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>Enter 6-Digit OTP</Text>
                    <TextInput
                      style={styles.input}
                      value={otpCode}
                      onChangeText={setOtpCode}
                      keyboardType="number-pad"
                      placeholder="123456"
                    />
                    <TouchableOpacity style={styles.primaryButton} onPress={handleArtisanVerifyOtp} disabled={loading}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Verify & Login</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setAuthStep('LOGIN')} style={{ marginTop: 12 }}>
                      <Text style={{ textAlign: 'center', color: '#6366f1' }}>Change phone number</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {/* Artisan Tab Bar */}
              <View style={styles.tabBar}>
                <TouchableOpacity
                  style={[styles.tabItem, artisanTab === 'PRODUCTS' && styles.tabItemActive]}
                  onPress={() => {
                    setSelectedProduct(null);
                    setArtisanTab('PRODUCTS');
                    loadArtisanData();
                  }}
                >
                  <Text style={[styles.tabText, artisanTab === 'PRODUCTS' && styles.tabTextActive]}>
                    My Listings ({myProducts.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabItem, artisanTab === 'CREATE' && styles.tabItemActive]}
                  onPress={() => {
                    setSelectedProduct(null);
                    setArtisanTab('CREATE');
                  }}
                >
                  <Text style={[styles.tabText, artisanTab === 'CREATE' && styles.tabTextActive]}>
                    + New Product
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabItem, artisanTab === 'INQUIRIES' && styles.tabItemActive]}
                  onPress={() => {
                    setSelectedProduct(null);
                    setArtisanTab('INQUIRIES');
                    loadArtisanData();
                  }}
                >
                  <Text style={[styles.tabText, artisanTab === 'INQUIRIES' && styles.tabTextActive]}>
                    Inquiries ({artisanInquiries.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TAB 1: Product List */}
              {artisanTab === 'PRODUCTS' && !selectedProduct && (
                <FlatList
                  data={myProducts}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ padding: 16 }}
                  renderItem={({ item }) => {
                    const statusColors: any = {
                      draft: '#9ca3af',
                      processing: '#f59e0b',
                      ready_for_review: '#3b82f6',
                      published: '#10b981',
                    };
                    const imgUrl = item.images?.[0]?.thumbnailUrl || item.images?.[0]?.rawImageUrl || 'https://via.placeholder.com/150';

                    return (
                      <TouchableOpacity style={styles.productCard} onPress={() => setSelectedProduct(item)}>
                        <Image source={{ uri: imgUrl }} style={styles.productThumb} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.productName}>{item.name}</Text>
                          <Text style={styles.productCategory}>{item.category?.label || 'Handicraft'}</Text>
                          <View style={styles.badgeRow}>
                            <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] || '#6b7280' }]}>
                              <Text style={styles.statusBadgeText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
                            </View>
                            {item.price ? (
                              <Text style={styles.productPrice}>₹{item.price}</Text>
                            ) : (
                              <Text style={styles.productPricePending}>Price not set</Text>
                            )}
                          </View>
                        </View>
                        <Text style={{ color: '#6366f1', fontWeight: 'bold' }}>→</Text>
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateTitle}>No listings found</Text>
                      <Text style={styles.emptyStateText}>Tap "+ New Product" to create your first AI-assisted catalog listing!</Text>
                    </View>
                  }
                />
              )}

              {/* TAB 1 DETAIL: Product Review & Polish Screen */}
              {artisanTab === 'PRODUCTS' && selectedProduct && (
                <ScrollView contentContainerStyle={{ padding: 16 }}>
                  <TouchableOpacity onPress={() => setSelectedProduct(null)} style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#6366f1', fontWeight: '600' }}>← Back to Listings</Text>
                  </TouchableOpacity>

                  <View style={styles.card}>
                    <Text style={styles.sectionHeader}>{selectedProduct.name}</Text>
                    <Text style={{ color: '#6b7280', marginBottom: 12 }}>Status: {selectedProduct.status.toUpperCase()}</Text>

                    {/* Image comparison preview */}
                    <Text style={styles.subHeader}>Product Imagery</Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                      {selectedProduct.images?.[0]?.rawImageUrl && (
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <Image source={{ uri: selectedProduct.images[0].rawImageUrl }} style={styles.reviewImage} />
                          <Text style={styles.caption}>Raw Artisan Photo</Text>
                        </View>
                      )}
                      {selectedProduct.images?.[0]?.processedImageUrl && (
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <Image source={{ uri: selectedProduct.images[0].processedImageUrl }} style={styles.reviewImage} />
                          <Text style={styles.caption}>AI Studio Enhanced</Text>
                        </View>
                      )}
                    </View>

                    {/* AI Smart Cataloging Output */}
                    <Text style={styles.subHeader}>AI Smart Cataloging (PRD 05)</Text>
                    <View style={styles.aiBox}>
                      <Text style={styles.aiFieldLabel}>Professional Title:</Text>
                      <Text style={styles.aiFieldValue}>{selectedProduct.catalog?.structuredFields?.title || selectedProduct.name}</Text>

                      <Text style={styles.aiFieldLabel}>Craft Technique:</Text>
                      <Text style={styles.aiFieldValue}>{selectedProduct.catalog?.structuredFields?.craftTechnique || 'Handcrafted'}</Text>

                      <Text style={styles.aiFieldLabel}>Materials:</Text>
                      <Text style={styles.aiFieldValue}>{selectedProduct.materials || 'Natural materials'}</Text>

                      <Text style={styles.aiFieldLabel}>Generated Catalog Description:</Text>
                      <Text style={styles.aiFieldValue}>
                        {selectedProduct.catalog?.finalDescription || selectedProduct.rawDescription || 'Generating...'}
                      </Text>

                      <Text style={styles.aiFieldLabel}>Cultural Heritage Story:</Text>
                      <Text style={styles.aiFieldValue}>
                        {selectedProduct.catalog?.structuredFields?.culturalSignificance || 'Traditional Indian craftsmanship.'}
                      </Text>
                    </View>

                    {/* AI Price Recommendation Output */}
                    <Text style={[styles.subHeader, { marginTop: 16 }]}>AI Price Guidance (PRD 07)</Text>
                    <View style={styles.priceBox}>
                      <Text style={styles.priceRangeText}>
                        Suggested Range: ₹{selectedProduct.suggestedPriceRange?.min || 1200} – ₹
                        {selectedProduct.suggestedPriceRange?.max || 1800}
                      </Text>
                      <Text style={styles.priceExplanation}>
                        {selectedProduct.priceRecommendation?.explanation ||
                          'Transparent calculation based on raw materials, fair wage hourly labor, and workshop overhead.'}
                      </Text>
                    </View>

                    {/* Final Artisan Price Decision */}
                    <Text style={[styles.inputLabel, { marginTop: 16 }]}>Final Selling Price (₹ INR)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={selectedProduct.price ? String(selectedProduct.price) : 'e.g. 1450'}
                      value={customPrice}
                      onChangeText={setCustomPrice}
                      keyboardType="numeric"
                    />

                    {selectedProduct.status !== 'published' && (
                      <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: '#10b981', marginTop: 16 }]}
                        onPress={() => handlePublish(selectedProduct.id)}
                        disabled={loading}
                      >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Publish to B2B Marketplace</Text>}
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              )}

              {/* TAB 2: Smart Creation Wizard */}
              {artisanTab === 'CREATE' && (
                <ScrollView contentContainerStyle={{ padding: 16 }}>
                  <View style={styles.card}>
                    <Text style={styles.sectionHeader}>Smart Product Creation Wizard</Text>
                    <Text style={styles.authDesc}>Describe your product with text or voice. ShilpAI handles the rest.</Text>

                    <Text style={styles.inputLabel}>Product Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Handcrafted Royal Blue Ceramic Vase"
                      value={productName}
                      onChangeText={setProductName}
                    />

                    <Text style={styles.inputLabel}>Craft Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      {categories.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.chip, selectedCategoryId === cat.id && styles.chipActive]}
                          onPress={() => setSelectedCategoryId(cat.id)}
                        >
                          <Text style={[styles.chipText, selectedCategoryId === cat.id && styles.chipTextActive]}>
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={styles.inputLabel}>Raw Materials</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Quartz stone, Multani Mitti, copper glaze"
                      value={materials}
                      onChangeText={setMaterials}
                    />

                    <Text style={styles.inputLabel}>Production Time</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 3 days"
                      value={productionTime}
                      onChangeText={setProductionTime}
                    />

                    <Text style={styles.inputLabel}>Voice Note / Audio Description (PRD 06)</Text>
                    <TouchableOpacity
                      style={[styles.voiceButton, voiceRecorded && { backgroundColor: '#10b981' }]}
                      onPress={handleSimulateVoiceRecording}
                    >
                      <Text style={styles.voiceButtonText}>
                        {voiceRecorded ? '✓ Voice Note Recorded & Transcribed' : '🎙️ Record Voice Note (Hindi/Regional)'}
                      </Text>
                    </TouchableOpacity>

                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>Raw Description (or Voice Transcript)</Text>
                    <TextInput
                      style={[styles.input, { height: 75 }]}
                      multiline
                      placeholder="Describe color, size, motifs, or special details..."
                      value={rawDescription}
                      onChangeText={setRawDescription}
                    />

                    <Text style={styles.inputLabel}>Sample Photo URL</Text>
                    <TextInput
                      style={styles.input}
                      value={sampleImageUrl}
                      onChangeText={setSampleImageUrl}
                    />

                    <TouchableOpacity
                      style={[styles.primaryButton, { marginTop: 16 }]}
                      onPress={handleCreateAndSubmitProduct}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Process with ShilpAI (Background Jobs)</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}

              {/* TAB 3: Artisan Inquiry Inbox */}
              {artisanTab === 'INQUIRIES' && (
                <FlatList
                  data={artisanInquiries}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ padding: 16 }}
                  renderItem={({ item }) => (
                    <View style={styles.inquiryCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.inquiryOrg}>{item.buyer?.organizationName || 'B2B Procurement'}</Text>
                        <Text style={[styles.inquiryStatus, { color: item.status === 'ACCEPTED' ? '#10b981' : '#f59e0b' }]}>
                          {item.status}
                        </Text>
                      </View>
                      <Text style={styles.inquiryProduct}>Product: {item.product?.name}</Text>
                      <Text style={styles.inquiryQty}>Requested Quantity: {item.quantity} units</Text>
                      <Text style={styles.inquiryLocation}>Target Delivery: {item.targetLocation || 'Not specified'}</Text>
                      <Text style={styles.inquiryMsg}>"{item.message}"</Text>

                      {item.status === 'SUBMITTED' && (
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                          <TouchableOpacity
                            style={[styles.smallButton, { backgroundColor: '#10b981' }]}
                            onPress={() => handleInquiryAction(item.id, 'ACCEPTED')}
                          >
                            <Text style={styles.smallButtonText}>Accept Inquiry</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.smallButton, { backgroundColor: '#ef4444' }]}
                            onPress={() => handleInquiryAction(item.id, 'DECLINED')}
                          >
                            <Text style={styles.smallButtonText}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateTitle}>No inquiries yet</Text>
                      <Text style={styles.emptyStateText}>When institutional buyers browse your listings, inquiries will appear here.</Text>
                    </View>
                  }
                />
              )}
            </View>
          )}
        </View>
      )}

      {/* ============================================================== */}
      {/* BUYER MODE VIEW (MARKETPLACE & INQUIRY)                        */}
      {/* ============================================================== */}
      {appMode === 'BUYER' && (
        <View style={{ flex: 1 }}>
          {/* Buyer Header Search & Sub-tabs */}
          <View style={styles.buyerSearchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search pottery, paintings, textiles, brass..."
              value={buyerSearchQuery}
              onChangeText={(text) => {
                setBuyerSearchQuery(text);
                loadBuyerMarketplace(text, selectedCategoryFilter);
              }}
            />
          </View>

          {/* Category Chips Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.chip, !selectedCategoryFilter && styles.chipActive]}
              onPress={() => {
                setSelectedCategoryFilter('');
                loadBuyerMarketplace(buyerSearchQuery, '');
              }}
            >
              <Text style={[styles.chipText, !selectedCategoryFilter && styles.chipTextActive]}>All Crafts</Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, selectedCategoryFilter === cat.id && styles.chipActive]}
                onPress={() => {
                  setSelectedCategoryFilter(cat.id);
                  loadBuyerMarketplace(buyerSearchQuery, cat.id);
                }}
              >
                <Text style={[styles.chipText, selectedCategoryFilter === cat.id && styles.chipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Marketplace Product Grid */}
          <FlatList
            data={buyerProducts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const imgUrl = item.images?.[0]?.processedImageUrl || item.images?.[0]?.rawImageUrl || 'https://via.placeholder.com/300';
              return (
                <TouchableOpacity style={styles.buyerCard} onPress={() => setBuyerDetailProduct(item)}>
                  <Image source={{ uri: imgUrl }} style={styles.buyerCardImage} />
                  <View style={{ padding: 12 }}>
                    <Text style={styles.buyerCardTitle}>{item.name}</Text>
                    <Text style={styles.buyerCardArtisan}>
                      By {item.artisan?.artisanProfile?.name || 'Master Artisan'} • {item.artisan?.artisanProfile?.locationState || 'India'}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <Text style={styles.buyerCardPrice}>₹{item.price || 'Inquire'}</Text>
                      <TouchableOpacity
                        style={styles.inquireButton}
                        onPress={() => {
                          setBuyerDetailProduct(item);
                          setInquiryModalVisible(true);
                        }}
                      >
                        <Text style={styles.inquireButtonText}>Send B2B Inquiry</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No published crafts found</Text>
                <Text style={styles.emptyStateText}>Switch to Artisan Mode to create and publish items!</Text>
              </View>
            }
          />

          {/* B2B INQUIRY MODAL */}
          <Modal visible={inquiryModalVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>B2B Inquiry to Artisan</Text>
                <Text style={styles.modalSub}>{buyerDetailProduct?.name}</Text>

                <Text style={styles.inputLabel}>Quantity Required (Units)</Text>
                <TextInput
                  style={styles.input}
                  value={inquiryQuantity}
                  onChangeText={setInquiryQuantity}
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>Delivery Location / City</Text>
                <TextInput
                  style={styles.input}
                  value={inquiryLocation}
                  onChangeText={setInquiryLocation}
                />

                <Text style={styles.inputLabel}>Custom Requirements & Message</Text>
                <TextInput
                  style={[styles.input, { height: 75 }]}
                  multiline
                  value={inquiryMessage}
                  onChangeText={setInquiryMessage}
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 1, backgroundColor: '#6b7280' }]}
                    onPress={() => setInquiryModalVisible(false)}
                  >
                    <Text style={styles.primaryButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 2 }]}
                    onPress={handleSendInquiry}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Submit Inquiry</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  headerSubtitle: { fontSize: 11, color: '#64748b' },
  modeToggleContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 3 },
  modeToggleButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  modeToggleActive: { backgroundColor: '#6366f1' },
  modeToggleText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  modeToggleTextActive: { color: '#ffffff' },

  authContainer: { flex: 1, justifyContent: 'center', padding: 20 },
  authCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, elevation: 3 },
  authTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  authDesc: { fontSize: 13, color: '#64748b', marginBottom: 16 },

  inputLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 12,
  },

  primaryButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },

  tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#6366f1' },

  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 1 },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  subHeader: { fontSize: 15, fontWeight: '700', color: '#334155', marginVertical: 8 },

  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  productThumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#e2e8f0' },
  productName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  productCategory: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#059669' },
  productPricePending: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },

  reviewImage: { width: '100%', height: 140, borderRadius: 8, resizeMode: 'cover' },
  caption: { fontSize: 11, color: '#64748b', marginTop: 4 },

  aiBox: { backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  aiFieldLabel: { fontSize: 11, fontWeight: '700', color: '#166534', marginTop: 6 },
  aiFieldValue: { fontSize: 13, color: '#14532d', marginTop: 2 },

  priceBox: { backgroundColor: '#eff6ff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  priceRangeText: { fontSize: 15, fontWeight: '800', color: '#1d4ed8' },
  priceExplanation: { fontSize: 12, color: '#1e40af', marginTop: 4 },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
    marginVertical: 4,
  },
  chipActive: { backgroundColor: '#6366f1' },
  chipText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  chipTextActive: { color: '#ffffff', fontWeight: '700' },

  voiceButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  voiceButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },

  inquiryCard: { backgroundColor: '#ffffff', padding: 14, borderRadius: 10, marginBottom: 12, elevation: 1 },
  inquiryOrg: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  inquiryStatus: { fontSize: 12, fontWeight: '700' },
  inquiryProduct: { fontSize: 13, fontWeight: '600', color: '#475569', marginTop: 4 },
  inquiryQty: { fontSize: 13, color: '#334155', marginTop: 2 },
  inquiryLocation: { fontSize: 12, color: '#64748b' },
  inquiryMsg: { fontSize: 12, color: '#334155', fontStyle: 'italic', marginTop: 6 },
  smallButton: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  smallButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  buyerSearchContainer: { padding: 12, backgroundColor: '#ffffff' },
  searchInput: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, fontSize: 14 },
  filterScroll: { backgroundColor: '#ffffff', paddingHorizontal: 12, paddingBottom: 8 },

  buyerCard: { backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 14, overflow: 'hidden', elevation: 2 },
  buyerCardImage: { width: '100%', height: 180, resizeMode: 'cover' },
  buyerCardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  buyerCardArtisan: { fontSize: 12, color: '#64748b', marginTop: 2 },
  buyerCardPrice: { fontSize: 16, fontWeight: '800', color: '#059669' },
  inquireButton: { backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  inquireButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },

  emptyState: { padding: 40, alignItems: 'center' },
  emptyStateTitle: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  emptyStateText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  modalSub: { fontSize: 13, color: '#6366f1', marginBottom: 12 },
});
